# Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
# or more contributor license agreements. Licensed under the Elastic License;
# you may not use this file except in compliance with the Elastic License.

require_relative "../spec_helper"
require "stud/temporary"

describe "Read configuration from elasticsearch" do
  before :each do
    @elasticsearch_service = elasticsearch

    @temporary_directory = Stud::Temporary.directory

    @pipelines = {
      "super_generator" => "input { generator { count => 100 } tcp { port => 6000 } } output { file { path => '#{@temporary_directory}/super_generator' }}",
      "another_generator" => "input { generator { count => 100 } tcp { port => 6002 } } output { file { path => '#{@temporary_directory}/another_generator' }}",
      "hello" => nil
    }

    cleanup_elasticsearch(".logstash*")
    cleanup_elasticsearch(".monitoring-logstash*")

    @pipelines.each do |pipeline_id, config|
      push_elasticsearch_config(pipeline_id, config) unless config.nil?
    end

    @logstash_service = logstash("bin/logstash -w 1", {
      :settings => {
        "xpack.management.enabled" => true,
        "xpack.management.pipeline.id" => @pipelines.keys,
        "xpack.management.logstash.poll_interval" => "1s",
        "xpack.management.elasticsearch.hosts" => ["http://localhost:9200"],
        "xpack.management.elasticsearch.username" => "elastic",
        "xpack.management.elasticsearch.password" => elastic_password,
        "xpack.monitoring.elasticsearch.username" => "elastic",
        "xpack.monitoring.elasticsearch.password" => elastic_password

      }, # will be saved in the logstash.yml
      :belzebuth => {
        :wait_condition => /Pipelines running/,
        :timeout => 5 * 60 # Fail safe, this mean something went wrong if we hit this before the wait_condition
      }
    })
  end

  let(:max_retry) { 100 }

  it "fetches the multiples configuration from elasticsearch" do
    elasticsearch_client.indices.refresh

    Stud.try(max_retry.times, [RSpec::Expectations::ExpectationNotMetError]) do
      @pipelines.keys do |pipeline_id|
        expect(File.exist?(File.join(@temporary_directory, pipeline_id))).to be_truthy
      end
    end
  end

  it "fetches new pipelines" do
    temporary_file = File.join(Stud::Temporary.directory, "hello.log")
    new_config = "input { generator { count => 10000 } tcp { port => 6008 }} output { file { path => '#{temporary_file}' } }"

    expect(File.exist?(temporary_file)).to be_falsey
    push_elasticsearch_config("hello", new_config)
    elasticsearch_client.indices.refresh

    Stud.try(max_retry.times, [RSpec::Expectations::ExpectationNotMetError]) do
      expect(File.exist?(temporary_file)).to be_truthy
    end
  end

  it "should immediately register a new pipeline state document when the pipeline is reloaded" do
    wait(40).for do
      count_hashes(@pipelines.keys)
    end.to eq(2)


    pipelines = {
      "super_generator" => "input { generator { count => 100 } tcp { port => 6005 } } output { file { path => '#{@temporary_directory}/super_generator_new' }}",
      "another_generator" => "input { generator { count => 100 } tcp { port => 6006 } } output { file { path => '#{@temporary_directory}/another_generator_new' }}"
    }

    pipelines.each do |pipeline_id, config|
      expect(File.exist?(File.join(@temporary_directory, "#{pipeline_id}_new"))).to be_falsey
      push_elasticsearch_config(pipeline_id, config)
    end

    wait(40).for do
      count_hashes(@pipelines.keys)
    end.to eq(4)
  end

  # Returns the number of hashes for the list of pipelines
  # Returns nil if the response is bad
  # This can happen if ES is not yet up or if the data is not yet in ES
  def count_hashes(pipelines)
    elasticsearch_client.indices.refresh

    query = {
      "size": 0, 
      "query": {
        "term": {
          "type": {
            "value": "logstash_state"
          }
        }
      },
      "aggs": {
        "pipeline_ids": {
          "terms": {
            "field": "logstash_state.pipeline.id",
            "size": 10
          },
          "aggs": {
            "pipeline_hashes": {
              "terms": {
                "field": "logstash_state.pipeline.hash",
                "size": 10
              }
            }
          }
        }
      }
    }

    begin
      res = elasticsearch_client.search(index: '.monitoring-logstash-*', body: query)
    rescue Elasticsearch::Transport::Transport::Errors::ServiceUnavailable 
      return nil
    end

    begin
      hashes = res["aggregations"]["pipeline_ids"]["buckets"]
          .select {|b| pipelines.include?(b["key"])}
          .map {|b| b["pipeline_hashes"] }

      puts hashes.inspect
      hashes
          .flat_map {|b| b["buckets"]}
          .size
    rescue
      # In the case that some part of the path is missing just return nil
      nil
    end
  end


  it "reloads the configuration when its different from the running pipeline" do
    pipelines = {
      "super_generator" => "input { generator { count => 100 } tcp { port => 6005 } } output { file { path => '#{@temporary_directory}/super_generator_new' }}",
      "another_generator" => "input { generator { count => 100 } tcp { port => 6006 } } output { file { path => '#{@temporary_directory}/another_generator_new' }}"
    }

    pipelines.each do |pipeline_id, config|
      expect(File.exist?(File.join(@temporary_directory, "#{pipeline_id}_new"))).to be_falsey
      push_elasticsearch_config(pipeline_id, config)
    end

    elasticsearch_client.indices.refresh

    pipelines.keys.each do |pipeline_id|
      Stud.try(max_retry.times, [RSpec::Expectations::ExpectationNotMetError]) do
        expect(File.exist?(File.join(@temporary_directory, "#{pipeline_id}_new"))).to be_truthy
      end
    end
  end

  after :each do
    @logstash_service.stop if !!@logstash_service
    @elasticsearch_service.stop if !!@elasticsearch_service
  end
end

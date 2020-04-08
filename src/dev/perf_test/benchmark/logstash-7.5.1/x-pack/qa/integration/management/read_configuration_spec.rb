# Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
# or more contributor license agreements. Licensed under the Elastic License;
# you may not use this file except in compliance with the Elastic License.

require_relative "../spec_helper"
require "stud/temporary"

describe "Read configuration from elasticsearch" do
  PIPELINE_ID = "super-generator"
  MAX_RETRY = 100

  def logstash_options(pipeline_id, wait_condition)
    {
      :settings => {
        "xpack.management.enabled" => true,
        "xpack.management.pipeline.id" => pipeline_id,
        "xpack.management.logstash.poll_interval" => "1s",
        "xpack.management.elasticsearch.hosts" => ["http://localhost:9200"],
        "xpack.management.elasticsearch.username" => "elastic",
        "xpack.management.elasticsearch.password" => elastic_password,
        "xpack.monitoring.elasticsearch.username" => "elastic",
        "xpack.monitoring.elasticsearch.password" => elastic_password
      },
      :belzebuth => {
        :wait_condition => wait_condition,
        :timeout => 5 * 60 # Fail safe, this mean something went wrong if we hit this before the wait_condition
      }
    }
  end

  def start_services(elasticsearch_options, logstash_options)
    @elasticsearch_service = elasticsearch(elasticsearch_options)

    cleanup_elasticsearch(".logstash*")

    config = "input { generator { count => 100 } tcp { port => 6000 } } output { null {} }"
    push_elasticsearch_config(PIPELINE_ID, config)

    @logstash_service = logstash("bin/logstash -w 1", logstash_options)
  end

  def stop_services
    @logstash_service.stop unless @logstash_service.nil?
    @elasticsearch_service.stop unless @elasticsearch_service.nil?
  end

  context "security is enabled" do
    before(:all) do
      start_services({}, logstash_options(PIPELINE_ID, /Pipelines running/))
    end

    after(:all) do
      stop_services
    end

    it "fetches the configuration from elasticsearch" do
      temporary_file = File.join(Stud::Temporary.directory, "hello.log")
      new_config = "input { generator { count => 10000 }} output { file { path => '#{temporary_file}' } }"
      expect(File.exist?(temporary_file)).to be_falsey
      push_elasticsearch_config(PIPELINE_ID, new_config)
      elasticsearch_client.indices.refresh

      Stud.try(MAX_RETRY.times, [RSpec::Expectations::ExpectationNotMetError]) do
        expect(File.exist?(temporary_file)).to be_truthy
      end
    end

    it "reloads the configuration when its different from the running pipeline" do
      [ File.join(Stud::Temporary.directory, "hello.log"),
        File.join(Stud::Temporary.directory, "whole-new-file.log") ].each do |temporary_file|
        new_config = "input { generator { count => 10000 }} output { file { path => '#{temporary_file}' } }"

        expect(File.exist?(temporary_file)).to be_falsey
        push_elasticsearch_config(PIPELINE_ID, new_config)
        elasticsearch_client.indices.refresh

        Stud.try(MAX_RETRY.times, [RSpec::Expectations::ExpectationNotMetError]) do
          expect(File.exist?(temporary_file)).to be_truthy
        end
      end
    end
  end

  context "security is disabled" do
    before(:all) do
      elasticsearch_options = {
        :settings => {
          "xpack.security.enabled" => false
        }
      }
      start_services(elasticsearch_options, logstash_options(PIPELINE_ID, /X-Pack Security needs to be enabled in Elasticsearch/))
    end

    after(:all) do
      stop_services
    end

    it "fails to start" do
      temporary_file = File.join(Stud::Temporary.directory, "hello.log")
      new_config = "input { generator { count => 10000 }} output { file { path => '#{temporary_file}' } }"
      expect(File.exist?(temporary_file)).to be_falsey
      push_elasticsearch_config(PIPELINE_ID, new_config)
      elasticsearch_client.indices.refresh

      Stud.try(MAX_RETRY.times, [RSpec::Expectations::ExpectationNotMetError]) do
        expect(File.exist?(temporary_file)).to be_falsey
      end
    end
  end
end

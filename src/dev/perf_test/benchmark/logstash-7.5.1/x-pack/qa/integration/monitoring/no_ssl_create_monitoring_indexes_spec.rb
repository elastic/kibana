# Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
# or more contributor license agreements. Licensed under the Elastic License;
# you may not use this file except in compliance with the Elastic License.

require_relative "../spec_helper"

describe "Without SSL monitoring index" do
  before :all do
    @elasticsearch_service = elasticsearch

    cleanup_elasticsearch
    elasticsearch_client.indices.delete :index => MONITORING_INDEXES
    elasticsearch_client.indices.refresh

    config = "input { generator { count => 100 } tcp { port => 6000 } } output { null {} }"

    @logstash_service = logstash("bin/logstash -e '#{config}' -w 1", {
      :settings => {
        "xpack.monitoring.collection.interval" => "1s",
        "xpack.monitoring.elasticsearch.username" => "elastic",
        "xpack.monitoring.elasticsearch.password" => elastic_password
      }, # will be saved in the logstash.yml
      :belzebuth => {
        :wait_condition => /Pipelines running/, # Check for all pipeline started
        :timeout => 5 * 60 # Fail safe, this mean something went wrong if we hit this before the wait_condition
      }
    })
  end

  include_examples "record monitoring data to es"

  after :all do
    @logstash_service.stop unless @logstash_service.nil?
    @elasticsearch_service.stop unless @elasticsearch_service.nil?
  end
end

# Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
# or more contributor license agreements. Licensed under the Elastic License;
# you may not use this file except in compliance with the Elastic License.

require_relative "../spec_helper"

describe "Monitoring is disabled" do
  before :all do
    @elasticsearch_service = elasticsearch

    cleanup_elasticsearch

    config = "input { generator { } } output { null {} }"

    @logstash_service = logstash("bin/logstash -e '#{config}' -w 1", {
      :settings => {
        "xpack.monitoring.enabled" => false,
        "xpack.monitoring.elasticsearch.username" => "elastic",
        "xpack.monitoring.elasticsearch.password" => elastic_password
      },
      :belzebuth => {
        :wait_condition => /Pipelines running/, # Check for all pipeline started
        :timeout => 5 * 60 # Fail safe, this mean something went wrong if we hit this before the wait_condition
      }
    })
  end

  after :all do
    @logstash_service.stop unless @logstash_service.nil?
    @elasticsearch_service.stop unless @elasticsearch_service.nil?
  end

  let(:monitoring_index) { ".monitoring-logstash-2-*" }

  it "doesn't record any metrics" do
    expect(elasticsearch_client.search(:index => monitoring_index)["hits"]["total"]["value"]).to  eq(0)
  end
end

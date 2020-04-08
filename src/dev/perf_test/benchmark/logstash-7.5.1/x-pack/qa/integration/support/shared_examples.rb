# Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
# or more contributor license agreements. Licensed under the Elastic License;
# you may not use this file except in compliance with the Elastic License.

require "spec_helper"
shared_examples "record monitoring data to es" do
  let(:max_retry) { 10 }
  let(:schemas_path) { File.join(File.dirname(__FILE__), "..", "..", "..", "spec", "monitoring", "schemas") }
  let(:retryable_errors) do
    [NoMethodError,
     RSpec::Expectations::ExpectationNotMetError,
     Elasticsearch::Transport::Transport::Errors::ServiceUnavailable,
     Elasticsearch::Transport::Transport::Errors::NotFound]
  end

  describe "metrics" do
    let(:schema_file) { File.join(schemas_path, "monitoring_document_schema.json") }
    it "records metrics on es" do
      Stud.try(max_retry.times, retryable_errors) do
        elasticsearch_client.indices.refresh
        api_response = elasticsearch_client.search :index => MONITORING_INDEXES, :body => {:query => {:term => {"type" => "logstash_stats"}}}
        expect(api_response["hits"]["total"]["value"]).to be > 0
        api_response["hits"]["hits"].each do |full_document|
          document = full_document["_source"]["logstash_stats"]
          expect(JSON::Validator.fully_validate(schema_file, document)).to be_empty
        end
      end
    end
  end

  describe "state" do 
    let(:schema_file) { File.join(schemas_path, "states_document_schema.json") }

    it "records state on es" do
      Stud.try(max_retry.times, retryable_errors) do
        elasticsearch_client.indices.refresh
        api_response = elasticsearch_client.search :index => MONITORING_INDEXES, :body => {:query => {:term => {"type" => "logstash_state"}}}
        expect(api_response["hits"]["total"]["value"]).to be > 0
        api_response["hits"]["hits"].each do |full_document|
          document = full_document["_source"]["logstash_state"]
          expect(JSON::Validator.fully_validate(schema_file, document)).to be_empty
        end
      end
    end
  end
end

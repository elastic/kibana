# Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
# or more contributor license agreements. Licensed under the Elastic License;
# you may not use this file except in compliance with the Elastic License.

require 'x-pack/logstash_registry'
require 'logstash/devutils/rspec/spec_helper'
require 'logstash/json'
require 'filters/azure_event'


describe LogStash::Filters::AzureEvent do
  describe "Parses the admin activity log" do
    let(:config) do
      <<-CONFIG
      filter {
        azure_event {
          # ensure defaults don't kick in
          default_match => ["nonexistent"]
        }
      }
      CONFIG
    end

    # as documented
    file = File.read(File.join(File.dirname(__FILE__), '../samples/activity_log/administrative1.json'))
    sample(LogStash::Json.load(file)) do
      expect(subject).to include("resourceId")
      expect(subject.get("[azure][subscription]")).to eq("DD042F02-6B3E-4F79-939A-6A381FFED3C0")
      expect(subject.get("[azure][resource_group]")).to eq("MYRESOURCEGROUP")
      expect(subject.get("[azure][provider]")).to eq("MICROSOFT.NETWORK")
      expect(subject.get("[azure][resource_type]")).to eq("NETWORKSECURITYGROUPS")
      expect(subject.get("[azure][resource_name]")).to eq("MYNSG")
      expect(subject.get("[azure][group]")).to eq("activity_log")
      expect(subject.get("[azure][category]")).to eq("Administrative")
      expect(subject).to include("activity_log_Administrative_properties")
      expect(subject).not_to include("properties")
    end


    describe "with default" do
      let(:config) do
        <<-CONFIG
      filter {
        azure_event {
          # allow default 
        }
      }
        CONFIG
      end
      # as observed
      file = File.read(File.join(File.dirname(__FILE__), '../samples/activity_log/administrative2.json'))
      sample(LogStash::Json.load(file)) do
        expect(subject).to include("resourceId")
        expect(subject.get("[azure][subscription]")).to eq("9103C2E0-A392-4CE3-BADD-E50F19378DEB")
        expect(subject.get("[azure][resource_group]")).to eq("MYLINUXVMRG")
        expect(subject.get("[azure][provider]")).to eq("MICROSOFT.STORAGE")
        expect(subject.get("[azure][resource_type]")).to eq("STORAGEACCOUNTS")
        expect(subject.get("[azure][resource_name]")).to eq("STORE835G")
        expect(subject.get("[azure][group]")).to eq("activity_log")
        expect(subject.get("[azure][category]")).to eq("Administrative")
        expect(subject).not_to include("activity_log_Administrative_properties")
        expect(subject).not_to include("properties")
      end


      # as observed, missing the resource group, type, and name
      file = File.read(File.join(File.dirname(__FILE__), '../samples/activity_log/administrative3.json'))
      sample(LogStash::Json.load(file)) do
        expect(subject).to include("resourceId")
        expect(subject.get("[azure][subscription]")).to eq("872F2E12-6CCC-4EAD-8D3C-AC833009C1A4")
        expect(subject.get("[azure][resource_group]")).to be_nil
        expect(subject.get("[azure][provider]")).to eq("MICROSOFT.ADVISOR")
        expect(subject.get("[azure][resource_type]")).to be_nil
        expect(subject.get("[azure][resource_name]")).to be_nil
        expect(subject.get("[azure][group]")).to eq("activity_log")
        expect(subject.get("[azure][category]")).to eq("Administrative")
        expect(subject).not_to include("activity_log_Administrative_properties")
        expect(subject).not_to include("properties")
      end
    end

  end

  describe "Parses the service health activity log" do
    let(:config) do
      <<-CONFIG
      filter {
        azure_event {
          # ensure defaults don't kick in
          default_match => ["nonexistent"]
        }
      }
      CONFIG
    end

    # as documented
    file = File.read(File.join(File.dirname(__FILE__), '../samples/activity_log/service_health1.json'))
    sample(LogStash::Json.load(file)) do
      expect(subject).to include("resourceId")
      expect(subject.get("[azure][subscription]")).to eq("MYSUBSCRIPTIONID")
      expect(subject.get("[azure][resource_group]")).to be_nil
      expect(subject.get("[azure][provider]")).to be_nil
      expect(subject.get("[azure][resource_type]")).to be_nil
      expect(subject.get("[azure][resource_name]")).to be_nil
      expect(subject.get("[azure][group]")).to eq("activity_log")
      expect(subject.get("[azure][category]")).to eq("ServiceHealth")
      expect(subject).to include("activity_log_ServiceHealth_properties")
      expect(subject).not_to include("properties")
    end

    # as observed
    file = File.read(File.join(File.dirname(__FILE__), '../samples/activity_log/service_health2.json'))
    sample(LogStash::Json.load(file)) do
      expect(subject).to include("resourceId")
      expect(subject.get("[azure][subscription]")).to eq("13100E9F-5DCE-4686-B4F4-FF997D407A75")
      expect(subject.get("[azure][resource_group]")).to be_nil
      expect(subject.get("[azure][provider]")).to be_nil
      expect(subject.get("[azure][resource_type]")).to be_nil
      expect(subject.get("[azure][resource_name]")).to be_nil
      expect(subject.get("[azure][group]")).to eq("activity_log")
      expect(subject.get("[azure][category]")).to eq("ServiceHealth")
      expect(subject).to include("activity_log_ServiceHealth_properties")
      expect(subject).not_to include("properties")
    end
  end

  describe "Parses the Security activity log" do
    let(:config) do
      <<-CONFIG
      filter {
        azure_event {
          # ensure defaults don't kick in
          default_match => ["nonexistent"]
        }
      }
      CONFIG
    end

    # as documented
    file = File.read(File.join(File.dirname(__FILE__), '../samples/activity_log/security1.json'))
    sample(LogStash::Json.load(file)) do
      expect(subject).to include("resourceId")
      expect(subject.get("[azure][subscription]")).to eq("D4742BB8-C279-4903-9653-9858B17D0C2E")
      expect(subject.get("[azure][resource_group]")).to be_nil
      expect(subject.get("[azure][provider]")).to eq("MICROSOFT.SECURITY")
      expect(subject.get("[azure][resource_type]")).to eq("LOCATIONS/ALERTS")
      expect(subject.get("[azure][resource_name]")).to eq("2518939942613820660_A48F8653-3FC6-4166-9F19-914F030A13D3")
      expect(subject.get("[azure][group]")).to eq("activity_log")
      expect(subject.get("[azure][category]")).to eq("Security")
      expect(subject).to include("activity_log_Security_properties")
      expect(subject).not_to include("properties")
    end

    # as observed
    file = File.read(File.join(File.dirname(__FILE__), '../samples/activity_log/security2.json'))
    sample(LogStash::Json.load(file)) do
      expect(subject).to include("resourceId")
      expect(subject.get("[azure][subscription]")).to eq("F628BA4C-F07B-4AEB-86CB-C89784BBD9B3")
      expect(subject.get("[azure][resource_group]")).to be_nil
      expect(subject.get("[azure][provider]")).to be_nil
      expect(subject.get("[azure][resource_type]")).to be_nil
      expect(subject.get("[azure][resource_name]")).to be_nil
      expect(subject.get("[azure][group]")).to eq("activity_log")
      expect(subject.get("[azure][category]")).to eq("Security")
      expect(subject).to include("activity_log_Security_properties")
      expect(subject).not_to include("properties")
    end
  end

  describe "Parses the Autoscale activity log" do
    let(:config) do
      <<-CONFIG
      filter {
        azure_event {
          # ensure defaults don't kick in
          default_match => ["nonexistent"]
        }
      }
      CONFIG
    end

    # as documented
    file = File.read(File.join(File.dirname(__FILE__), '../samples/activity_log/auto_scale1.json'))
    sample(LogStash::Json.load(file)) do
      assert
    end

    # as observed TODO: actually observe this ! (I don't have any examples for autoscale)
    file = File.read(File.join(File.dirname(__FILE__), '../samples/activity_log/auto_scale2.json'))
    sample(LogStash::Json.load(file)) do
      assert
    end

    def assert
      expect(subject).to include("resourceId")
      expect(subject.get("[azure][subscription]")).to eq("MYSUBSCRIPTIONID")
      expect(subject.get("[azure][resource_group]")).to eq("MYRESOURCEGROUP")
      expect(subject.get("[azure][provider]")).to eq("MICROSOFT.INSIGHTS")
      expect(subject.get("[azure][resource_type]")).to eq("AUTOSCALESETTINGS")
      expect(subject.get("[azure][resource_name]")).to eq("MYRESOURCEGROUP-PRODUCTION-MYRESOURCE-MYRESOURCEGROUP")
      expect(subject.get("[azure][group]")).to eq("activity_log")
      expect(subject.get("[azure][category]")).to eq("Autoscale")
      expect(subject).to include("activity_log_Autoscale_properties")
      expect(subject).not_to include("properties")
    end

  end

  describe "Parses the Alert activity log" do
    let(:config) do
      <<-CONFIG
      filter {
        azure_event {
          # ensure defaults don't kick in
          default_match => ["nonexistent"]
        }
      }
      CONFIG
    end

    # as documented
    file = File.read(File.join(File.dirname(__FILE__), '../samples/activity_log/alert1.json'))
    sample(LogStash::Json.load(file)) do
      expect(subject).to include("resourceId")
      expect(subject.get("[azure][subscription]")).to eq("MYSUBSCRIPTIONID")
      expect(subject.get("[azure][resource_group]")).to eq("MYRESOURCEGROUP")
      expect(subject.get("[azure][provider]")).to eq("MICROSOFT.CLASSICCOMPUTE")
      expect(subject.get("[azure][resource_type]")).to eq("DOMAINNAMES/SLOTS/ROLES")
      expect(subject.get("[azure][resource_name]")).to eq("EVENT.BACKGROUNDJOBSWORKER.RAZZLE")
      expect(subject.get("[azure][group]")).to eq("activity_log")
      expect(subject.get("[azure][category]")).to eq("Alert")
      expect(subject).to include("activity_log_Alert_properties")
      expect(subject).not_to include("properties")
    end

    # as observed
    file = File.read(File.join(File.dirname(__FILE__), '../samples/activity_log/alert2.json'))
    sample(LogStash::Json.load(file)) do
      expect(subject).to include("resourceId")
      expect(subject.get("[azure][subscription]")).to eq("C27F13D5-E19A-4A4C-8415-4056C7C752BC")
      expect(subject.get("[azure][resource_group]")).to eq("DEFAULT-ACTIVITYLOGALERTS")
      expect(subject.get("[azure][provider]")).to eq("MICROSOFT.INSIGHTS")
      expect(subject.get("[azure][resource_type]")).to eq("ACTIVITYLOGALERTS")
      expect(subject.get("[azure][resource_name]")).to eq("NOTIFY OPEN HEALTH ALERT")
      expect(subject.get("[azure][group]")).to eq("activity_log")
      expect(subject.get("[azure][category]")).to eq("Alert")
      expect(subject).to include("activity_log_Alert_properties")
      expect(subject).not_to include("properties")
    end

  end

  describe "Parses database wait stats logs" do
    let(:config) do
      <<-CONFIG
      filter {
        azure_event {

        }
      }
      CONFIG
    end

    # sql diagnostic
    file = File.read(File.join(File.dirname(__FILE__), '../samples/sql_diagnostics/database_wait_statistics.json'))
    sample(LogStash::Json.load(file)) do
      expect(subject).to include("resourceId")
      expect(subject.get("[azure][subscription]")).to eq("741FD6F5-9FB8-462C-97C3-3HF4CH23HC2A")
      expect(subject.get("[azure][resource_group]")).to eq("GO5RG")
      expect(subject.get("[azure][provider]")).to eq("MICROSOFT.SQL")
      expect(subject.get("[azure][resource_type]")).to eq("SERVERS/DATABASES")
      expect(subject.get("[azure][resource_name]")).to eq("WORKGO5")
      # db specific resources
      expect(subject.get("[azure][server]")).to eq("GO5RS")
      expect(subject.get("[azure][database]")).to eq("WORKGO5")
      expect(subject.get("[azure][server_and_database]")).to eq("GO5RS/WORKGO5")
      expect(subject.get("[azure][db_unique_id]")).to eq("741FD6F5-9FB8-462C-97C3-3HF4CH23HC2A/GO5RG/GO5RS/WORKGO5")
      # group/category
      expect(subject.get("[azure][group]")).to eq("sql_diagnostics")
      expect(subject.get("[azure][category]")).to eq("DatabaseWaitStatistics")
      expect(subject).to include("sql_diagnostics_DatabaseWaitStatistics_properties")
      expect(subject).not_to include("properties")

    end

  end
  describe "Parses database block logs" do
    let(:config) do
      <<-CONFIG
      filter {
        azure_event {

        }
      }
      CONFIG
    end

    file = File.read(File.join(File.dirname(__FILE__), '../samples/sql_diagnostics/blocks.json'))
    sample(LogStash::Json.load(file)) do
      expect(subject).to include("resourceId")
      expect(subject.get("[azure][subscription]")).to eq("851FD0F5-9GB8-552C-41C3-3TH4FA231C3A")
      expect(subject.get("[azure][resource_group]")).to eq("DEMTP789")
      expect(subject.get("[azure][provider]")).to eq("MICROSOFT.SQL")
      expect(subject.get("[azure][resource_type]")).to eq("SERVERS/DATABASES")
      expect(subject.get("[azure][resource_name]")).to eq("DB05001")
      # db specific resources
      expect(subject.get("[azure][server]")).to eq("SRV1238FG9")
      expect(subject.get("[azure][database]")).to eq("DB05001")
      expect(subject.get("[azure][server_and_database]")).to eq("SRV1238FG9/DB05001")
      expect(subject.get("[azure][db_unique_id]")).to eq("851FD0F5-9GB8-552C-41C3-3TH4FA231C3A/DEMTP789/SRV1238FG9/DB05001")
      # group/category
      expect(subject.get("[azure][group]")).to eq("sql_diagnostics")
      expect(subject.get("[azure][category]")).to eq("Blocks")
      expect(subject).to include("sql_diagnostics_Blocks_properties")
      expect(subject).not_to include("properties")
    end
  end

  describe "Parses database error logs" do
    let(:config) do
      <<-CONFIG
      filter {
        azure_event {

        }
      }
      CONFIG
    end

    file = File.read(File.join(File.dirname(__FILE__), '../samples/sql_diagnostics/errors.json'))
    sample(LogStash::Json.load(file)) do
      expect(subject).to include("resourceId")
      expect(subject.get("[azure][subscription]")).to eq("846FY0F5-9C8H-452C-95C3-555555666C2A")
      expect(subject.get("[azure][resource_group]")).to eq("OPT489")
      expect(subject.get("[azure][provider]")).to eq("MICROSOFT.SQL")
      expect(subject.get("[azure][resource_type]")).to eq("SERVERS/DATABASES")
      expect(subject.get("[azure][resource_name]")).to eq("DB874999")
      # db specific resources
      expect(subject.get("[azure][server]")).to eq("OPT489")
      expect(subject.get("[azure][database]")).to eq("DB874999")
      expect(subject.get("[azure][server_and_database]")).to eq("OPT489/DB874999")
      expect(subject.get("[azure][db_unique_id]")).to eq("846FY0F5-9C8H-452C-95C3-555555666C2A/OPT489/OPT489/DB874999")
      # group/category
      expect(subject.get("[azure][group]")).to eq("sql_diagnostics")
      expect(subject.get("[azure][category]")).to eq("Errors")
      expect(subject).to include("sql_diagnostics_Errors_properties")
      expect(subject).not_to include("properties")
    end
  end

  describe "Parses database timeout logs" do
    let(:config) do
      <<-CONFIG
      filter {
        azure_event {

        }
      }
      CONFIG
    end

    file = File.read(File.join(File.dirname(__FILE__), '../samples/sql_diagnostics/timeouts.json'))
    sample(LogStash::Json.load(file)) do
      expect(subject).to include("resourceId")
      expect(subject.get("[azure][subscription]")).to eq("E3E7F07F-161E-4591-BB76-711473D4940C")
      expect(subject.get("[azure][resource_group]")).to eq("ST76")
      expect(subject.get("[azure][provider]")).to eq("MICROSOFT.SQL")
      expect(subject.get("[azure][resource_type]")).to eq("SERVERS/DATABASES")
      expect(subject.get("[azure][resource_name]")).to eq("DB9977")
      # db specific resources
      expect(subject.get("[azure][server]")).to eq("ST76")
      expect(subject.get("[azure][database]")).to eq("DB9977")
      expect(subject.get("[azure][server_and_database]")).to eq("ST76/DB9977")
      expect(subject.get("[azure][db_unique_id]")).to eq("E3E7F07F-161E-4591-BB76-711473D4940C/ST76/ST76/DB9977")
      # group/category
      expect(subject.get("[azure][group]")).to eq("sql_diagnostics")
      expect(subject.get("[azure][category]")).to eq("Timeouts")
      expect(subject).to include("sql_diagnostics_Timeouts_properties")
      expect(subject).not_to include("properties")
    end
  end

  describe "Parses query store runtime statistic logs" do
    let(:config) do
      <<-CONFIG
      filter {
        azure_event {

        }
      }
      CONFIG
    end

    file = File.read(File.join(File.dirname(__FILE__), '../samples/sql_diagnostics/querystore_runtime_statistics.json'))
    sample(LogStash::Json.load(file)) do
      expect(subject).to include("resourceId")
      expect(subject.get("[azure][subscription]")).to eq("CBB8D135-BF4F-4792-B835-5872F7EAC917")
      expect(subject.get("[azure][resource_group]")).to eq("WWD66")
      expect(subject.get("[azure][provider]")).to eq("MICROSOFT.SQL")
      expect(subject.get("[azure][resource_type]")).to eq("SERVERS/DATABASES")
      expect(subject.get("[azure][resource_name]")).to eq("DB73635G")
      # db specific resources
      expect(subject.get("[azure][server]")).to eq("WWD66")
      expect(subject.get("[azure][database]")).to eq("DB73635G")
      expect(subject.get("[azure][server_and_database]")).to eq("WWD66/DB73635G")
      expect(subject.get("[azure][db_unique_id]")).to eq("CBB8D135-BF4F-4792-B835-5872F7EAC917/WWD66/WWD66/DB73635G")
      # group/category
      expect(subject.get("[azure][group]")).to eq("sql_diagnostics")
      expect(subject.get("[azure][category]")).to eq("QueryStoreRuntimeStatistics")
      expect(subject).to include("sql_diagnostics_QueryStoreRuntimeStatistics_properties")
      expect(subject).not_to include("properties")
    end
  end

  describe "Parses querystore wait statistics logs" do
    let(:config) do
      <<-CONFIG
      filter {
        azure_event {

        }
      }
      CONFIG
    end

    file = File.read(File.join(File.dirname(__FILE__), '../samples/sql_diagnostics/querystore_wait_statistics.json'))
    sample(LogStash::Json.load(file)) do
      expect(subject).to include("resourceId")
      expect(subject.get("[azure][subscription]")).to eq("70E322AB-5B33-40C7-AD1E-88B2B7CFA236")
      expect(subject.get("[azure][resource_group]")).to eq("W66PT")
      expect(subject.get("[azure][provider]")).to eq("MICROSOFT.SQL")
      expect(subject.get("[azure][resource_type]")).to eq("SERVERS/DATABASES")
      expect(subject.get("[azure][resource_name]")).to eq("DB45")
      # db specific resources
      expect(subject.get("[azure][server]")).to eq("W66PT")
      expect(subject.get("[azure][database]")).to eq("DB45")
      expect(subject.get("[azure][server_and_database]")).to eq("W66PT/DB45")
      expect(subject.get("[azure][db_unique_id]")).to eq("70E322AB-5B33-40C7-AD1E-88B2B7CFA236/W66PT/W66PT/DB45")
      # group/category
      expect(subject.get("[azure][group]")).to eq("sql_diagnostics")
      expect(subject.get("[azure][category]")).to eq("QueryStoreWaitStatistics")
      expect(subject).to include("sql_diagnostics_QueryStoreWaitStatistics_properties")
      expect(subject).not_to include("properties")
    end
  end

  describe "Parses database metric logs" do
    let(:config) do
      <<-CONFIG
      filter {
        azure_event {

        }
      }
      CONFIG
    end

    file = File.read(File.join(File.dirname(__FILE__), '../samples/sql_diagnostics/metric.json'))
    sample(LogStash::Json.load(file)) do
      expect(subject).to include("resourceId")
      expect(subject.get("[azure][subscription]")).to eq("D427EE51-17CB-441A-9363-07390D5DC79E")
      expect(subject.get("[azure][resource_group]")).to eq("RG5")
      expect(subject.get("[azure][provider]")).to eq("MICROSOFT.SQL")
      expect(subject.get("[azure][resource_type]")).to eq("SERVERS/DATABASES")
      expect(subject.get("[azure][resource_name]")).to eq("DJFU48")
      # db specific resources
      expect(subject.get("[azure][server]")).to eq("SRV12")
      expect(subject.get("[azure][database]")).to eq("DJFU48")
      expect(subject.get("[azure][server_and_database]")).to eq("SRV12/DJFU48")
      expect(subject.get("[azure][db_unique_id]")).to eq("D427EE51-17CB-441A-9363-07390D5DC79E/RG5/SRV12/DJFU48")
      # group/category
      expect(subject.get("[azure][group]")).to eq("sql_diagnostics")
      expect(subject.get("[azure][category]")).to eq("Metric")
      expect(subject).not_to include("properties")
    end
  end

  describe "Fails to parse" do
    let(:config) do
      <<-CONFIG
      filter {
        azure_event {

        }
      }
      CONFIG
    end

    sample("{'a': 'b'}") do
      expect(subject).to include("tags")
      expect(subject.get("[tags][0]")).to eq("_azure_event_failure")
    end
  end

end

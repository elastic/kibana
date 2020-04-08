# encoding: utf-8
require "logstash/util"

# This class exists to format the settings for default worker threads
module LogStash module Util class WorkerThreadsDefaultPrinter

  def initialize(settings)
    @setting = settings.fetch('pipeline.workers', 0)
    @default = settings.fetch('default-pipeline-workers', 0)
  end

  def visit(collector)
    visit_setting(collector)
    visit_default(collector)
  end

  def visit_setting(collector)
    return if @setting == 0
    collector.push("User set pipeline workers: #{@setting}")
  end

  def visit_default(collector)
    return if @default == 0
    collector.push "Default pipeline workers: #{@default}"
  end

end end end


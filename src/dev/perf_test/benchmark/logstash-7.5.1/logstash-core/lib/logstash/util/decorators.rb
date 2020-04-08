# encoding: utf-8
require "logstash/util"

module LogStash::Util

  # Decorators provides common manipulation on the event data.
  module Decorators
    include LogStash::Util::Loggable
    extend self

    # fields is a hash of field => value
    # where both `field` and `value` can use sprintf syntax.
    def add_fields(fields,event, pluginname)
      fields.each do |field, value|
        field = event.sprintf(field)
        value = Array(value)
        value.each do |v|
          v = event.sprintf(v)
          if event.include?(field)
            # note below that the array field needs to be updated then reassigned to the event.
            # this is important because a construct like event[field] << v will not work
            # in the current Java event implementation. see https://github.com/elastic/logstash/issues/4140
            a = Array(event.get(field))
            a << v
            event.set(field, a)
          else
            event.set(field, v)
          end
          self.logger.debug? and self.logger.debug("#{pluginname}: adding value to field", "field" => field, "value" => value)
        end
      end
    end

    # tags is an array of string. sprintf syntax can be used.
    def add_tags(new_tags, event, pluginname)
      return if new_tags.empty?

      tags = Array(event.get("tags")) # note that Array(nil) => []

      new_tags.each do |new_tag|
        new_tag = event.sprintf(new_tag)
        self.logger.debug? and self.logger.debug("#{pluginname}: adding tag", "tag" => new_tag)
        # note below that the tags array field needs to be updated then reassigned to the event.
        # this is important because a construct like event["tags"] << tag will not work
        # in the current Java event implementation. see https://github.com/elastic/logstash/issues/4140
        tags << new_tag  #unless tags.include?(new_tag)
      end

      event.set("tags", tags)
    end

  end # module LogStash::Util::Decorators

end # module LogStash::Util

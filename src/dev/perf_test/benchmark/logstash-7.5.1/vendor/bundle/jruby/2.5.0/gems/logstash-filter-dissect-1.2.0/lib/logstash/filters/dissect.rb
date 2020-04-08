# encoding: utf-8
require "logstash/filters/base"
require "logstash/namespace"

require "java"
require "jruby-dissect-library_jars"
require "jruby_dissector"

# The Dissect filter is a kind of split operation. Unlike a regular split operation where one delimiter is applied to the whole string, this operation applies a set of delimiters # to a string value. +
# Dissect does not use regular expressions and is very fast. +
# However, if the structure of your text varies from line to line then Grok is more suitable. +
# There is a hybrid case where Dissect can be used to de-structure the section of the line that is reliably repeated and then Grok can be used on the remaining field values with # more regex predictability and less overall work to do. +
#
# A set of fields and delimiters is called a *dissection*.
#
# The dissection is described using a set of `%{}` sections:
# ....
# %{a} - %{b} - %{c}
# ....
#
# A *field* is the text from `%` to `}` inclusive.
#
# A *delimiter* is the text between `}` and `%` characters.
#
# [NOTE]
# delimiters can't contain these `}{%` characters.
#
# The config might look like this:
# ....
#   filter {
#     dissect {
#       mapping => {
#         "message" => "%{ts} %{+ts} %{+ts} %{src} %{} %{prog}[%{pid}]: %{msg}"
#       }
#     }
#   }
# ....
# When dissecting a string from left to right, text is captured upto the first delimiter - this captured text is stored in the first field. This is repeated for each field/# delimiter pair thereafter until the last delimiter is reached, then *the remaining text is stored in the last field*. +
#
# *The Key:* +
# The key is the text between the `%{` and `}`, exclusive of the ?, +, & prefixes and the ordinal suffix. +
# `%{?aaa}` - key is `aaa` +
# `%{+bbb/3}` - key is `bbb` +
# `%{&ccc}` - key is `ccc` +
#
# *Normal field notation:* +
# The found value is added to the Event using the key. +
# `%{some_field}` - a normal field has no prefix or suffix
#
# *Skip field notation:* +
# The found value is stored internally but not added to the Event. +
# The key, if supplied, is prefixed with a `?`.
#
# `%{}` is an empty skip field.
#
# `%{?foo}` is a named skip field.
#
# *Append field notation:* +
# The value is appended to another value or stored if its the first field seen. +
# The key is prefixed with a `+`. +
# The final value is stored in the Event using the key. +
#
# [NOTE]
# ====
# The delimiter found before the field is appended with the value. +
# If no delimiter is found before the field, a single space character is used.
# ====
#
# `%{+some_field}` is an append field. +
# `%{+some_field/2}` is an append field with an order modifier.
#
# An order modifier, `/digits`, allows one to reorder the append sequence. +
# e.g. for a text of `1 2 3 go`, this `%{+a/2} %{+a/1} %{+a/4} %{+a/3}` will build a key/value of `a => 2 1 go 3` +
# Append fields without an order modifier will append in declared order. +
# e.g. for a text of `1 2 3 go`, this `%{a} %{b} %{+a}` will build two key/values of `a => 1 3 go, b => 2` +
#
# *Indirect field notation:* +
# The found value is added to the Event using the found value of another field as the key. +
# The key is prefixed with a `&`. +
# `%{&some_field}` - an indirect field where the key is indirectly sourced from the value of `some_field`. +
# e.g. for a text of `error: some_error, some_description`, this `error: %{?err}, %{&err}` will build a key/value of `some_error => some_description`.
#
# [NOTE]
# for append and indirect field the key can refer to a field that already exists in the event before dissection.
#
# [NOTE]
# use a Skip field if you do not want the indirection key/value stored.
#
# e.g. for a text of `google: 77.98`, this `%{?a}: %{&a}` will build a key/value of `google => 77.98`.
#
# [NOTE]
# ===============================
# append and indirect cannot be combined and will fail validation. +
# `%{+&something}` - will add a value to the `&something` key, probably not the intended outcome. +
# `%{&+something}` will add a value to the `+something` key, again probably unintended. +
# ===============================
#
# *Delimiter repetition:* +
# In the source text if a field has variable width padded with delimiters, the padding will be ignored. +
# e.g. for texts of:
# ....
# 00000043 ViewReceiver  I
# 000000b3 Peer          I
# ....
# with a dissection of `%{a} %{b} %{c}`; the padding is ignored, `event.get([c]) -> "I"`
#
# [NOTE]
# ====
# You probably want to use this filter inside an `if` block. +
# This ensures that the event contains a field value with a suitable structure for the dissection.
# ====
#
# For example...
# ....
# filter {
#   if [type] == "syslog" or "syslog" in [tags] {
#     dissect {
#       mapping => {
#         "message" => "%{ts} %{+ts} %{+ts} %{src} %{} %{prog}[%{pid}]: %{msg}"
#       }
#     }
#   }
# }
# ....

module LogStash module Filters class Dissect < LogStash::Filters::Base

  config_name "dissect"

  # A hash of dissections of `field => value` +
  # A later dissection can be done on values from a previous dissection or they can be independent.
  #
  # For example
  # [source, ruby]
  # filter {
  #   dissect {
  #     mapping => {
  #       "message" => "%{field1} %{field2} %{description}"
  #       "description" => "%{field3} %{field4} %{field5}"
  #     }
  #   }
  # }
  #
  # This is useful if you want to keep the field `description` but also
  # dissect it some more.

  config :mapping, :validate => :hash, :default => {}

  # With this setting `int` and `float` datatype conversions can be specified. +
  # These will be done after all `mapping` dissections have taken place. +
  # Feel free to use this setting on its own without a `mapping` section. +
  #
  # For example
  # [source, ruby]
  # filter {
  #   dissect {
  #     convert_datatype => {
  #       cpu => "float"
  #       code => "int"
  #     }
  #   }
  # }
  config :convert_datatype, :validate => :hash, :default => {}

  # Append values to the `tags` field when dissection fails
  config :tag_on_failure, :validate => :array, :default => ["_dissectfailure"]

  public

  def register
    needs_decoration = @add_field.size + @add_tag.size + @remove_field.size + @remove_tag.size > 0
    @dissector = LogStash::Dissector.new(@mapping, self, @convert_datatype, needs_decoration)
  end

  def filter(event)
    # all plugin functions happen in the JRuby extension:
    # debug, warn and error logging, filter_matched, tagging etc.
    @dissector.dissect(event)
  end

  def multi_filter(events)
    LogStash::Util.set_thread_plugin(self)
    @dissector.dissect_multi(events)
    events
  end

  # this method is stubbed during testing
  # a reference to it in the JRuby Extension `initialize` may not be valid
  def metric_increment(metric_name)
    metric.increment(metric_name)
  end

  # the JRuby Extension `initialize` method stores a DynamicMethod reference to this method
  def increment_matches_metric
    metric_increment(:matches)
  end

  # the JRuby Extension `initialize` method stores a DynamicMethod reference to this method
  def increment_failures_metric
    metric_increment(:failures)
  end
end end end

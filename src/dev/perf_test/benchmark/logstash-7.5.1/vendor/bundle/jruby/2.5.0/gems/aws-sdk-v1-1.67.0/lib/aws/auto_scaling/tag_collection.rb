# Copyright 2011-2013 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# Licensed under the Apache License, Version 2.0 (the "License"). You
# may not use this file except in compliance with the License. A copy of
# the License is located at
#
#     http://aws.amazon.com/apache2.0/
#
# or in the "license" file accompanying this file. This file is
# distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF
# ANY KIND, either express or implied. See the License for the specific
# language governing permissions and limitations under the License.

module AWS
  class AutoScaling

    # Provides an interface for enumerating tags defined in Auto Scaling.
    #
    #     auto_scaling = AWS::AutoScaling.new
    #     auto_scaling.tags.each do |tag|
    #        puts "#{tag.key}:#{tag.value}"
    #     end
    #
    # ## Filters
    #
    # You can filter the tags returned using {#filter}:
    #
    #     # returns tags with the key "role"
    #     auto_scaling.filter(:key, 'role').to_a
    #
    #     # returns tags with the key "role" and value "webserver"
    #     auto_scaling.filter(:key, 'role').filter(:value, 'webserver')to_a
    #
    #     # returns tags with the Auto Scaling group name "group1"
    #     auto_scaling.filter(:auto_scaling_group, 'group1').to_a
    #
    #     # returns all tags that propagate at launch
    #     auto_scaling.filter(:propagate_at_launch, true).to_a
    #
    # ## Creating Tags
    #
    # You can create Auto Scaling tags when you:
    #
    # * [create]{GroupCollection#create} an Auto Scaling group
    # * [update]{Group#update} an Auto Scaling group
    #
    # Both of these methods accept a `:tags` option.
    #
    #     tags = [
    #       { :key => 'auto-scaling-instance' },       # tag name only
    #       { :key => 'role', :value => 'webserver' }, # tag name and value
    #     ]
    #
    #     # creating a group with tags
    #     group = auto_scaling.groups.create('group-name', :tags => tags, ...)
    #
    #     # updating a group's tags
    #     group.update(:tags => tags)
    #
    class TagCollection

      include Core::Collection::WithLimitAndNextToken

      # @api private
      def initialize options = {}
        @filters = options.delete(:filters) || []
        super
      end

      # Filters the tags by the given filter name and value(s).
      #
      # ``
      # # return tags with the key "role" and the value "webserver"
      # auto_scaling.tags.filter(:key, 'role').filer(:value, 'webserver')
      # ``
      #
      # @param [Symbol] name Valid filter names include:
      #
      #   * :key
      #   * :value
      #   * :propagate_at_launch
      #   * :auto_scaling_group
      #
      # @param [Array<String>] values
      #
      # @return [TagCollection]
      #
      def filter name, *values
        name = name.to_s.gsub(/_/, '-')
        values = values.flatten.map(&:to_s)
        filter = { :name => name, :values => values }
        TagCollection.new(:filters => @filters + [filter], :config => config)
      end

      protected

      def _each_item next_token, limit, options = {}, &block

        options[:next_token] = next_token if next_token
        options[:max_records] = limit if limit
        options[:filters] = @filters unless @filters.empty?

        resp = client.describe_tags(options)
        resp.tags.each do |tag|
          yield(Tag.new(tag.to_hash.merge(:config => config)))
        end

        resp.data[:next_token]

      end

    end
  end
end

# Copyright 2011-2014 Amazon.com, Inc. or its affiliates. All Rights Reserved.
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
  module Core

    # @api private
    module IniParser

      def self.parse(ini)
        current_section = {}
        map = {}
        ini.split(/\r?\n/).each do |line|
          line = line.split(/^|\s;/).first # remove comments
          section = line.match(/^\s*\[([^\[\]]+)\]\s*$/) unless line.nil?
          if section
            current_section = section[1]
          elsif current_section
            item = line.match(/^\s*(.+?)\s*=\s*(.+)\s*$/) unless line.nil?
            if item
              map[current_section] = map[current_section] || {}
              map[current_section][item[1]] = item[2]
            end
          end  
        end
        map
      end

    end

  end
end

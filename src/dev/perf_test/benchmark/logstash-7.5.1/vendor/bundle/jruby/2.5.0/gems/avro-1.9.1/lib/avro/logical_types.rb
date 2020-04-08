# -*- coding: utf-8 -*-
# Licensed to the Apache Software Foundation (ASF) under one
# or more contributor license agreements.  See the NOTICE file
# distributed with this work for additional information
# regarding copyright ownership.  The ASF licenses this file
# to you under the Apache License, Version 2.0 (the
# "License"); you may not use this file except in compliance
# with the License.  You may obtain a copy of the License at
#
# https://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

require 'date'

module Avro
  module LogicalTypes
    module IntDate
      EPOCH_START = Date.new(1970, 1, 1)

      def self.encode(date)
        return date.to_i if date.is_a?(Numeric)

        (date - EPOCH_START).to_i
      end

      def self.decode(int)
        EPOCH_START + int
      end
    end

    module TimestampMillis
      def self.encode(value)
        return value.to_i if value.is_a?(Numeric)

        time = value.to_time
        time.to_i * 1000 + time.usec / 1000
      end

      def self.decode(int)
        s, ms = int / 1000, int % 1000
        Time.at(s, ms * 1000).utc
      end
    end

    module TimestampMicros
      def self.encode(value)
        return value.to_i if value.is_a?(Numeric)

        time = value.to_time
        time.to_i * 1000_000 + time.usec
      end

      def self.decode(int)
        s, us = int / 1000_000, int % 1000_000
        Time.at(s, us).utc
      end
    end

    module Identity
      def self.encode(datum)
        datum
      end

      def self.decode(datum)
        datum
      end
    end

    TYPES = {
      "int" => {
        "date" => IntDate
      },
      "long" => {
        "timestamp-millis" => TimestampMillis,
        "timestamp-micros" => TimestampMicros
      },
    }.freeze

    def self.type_adapter(type, logical_type)
      return unless logical_type

      TYPES.fetch(type, {}.freeze).fetch(logical_type, Identity)
    end
  end
end

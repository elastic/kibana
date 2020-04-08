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

require 'test_help'

class TestLogicalTypes < Test::Unit::TestCase
  def test_int_date
    schema = Avro::Schema.parse <<-SCHEMA
      { "type": "int", "logicalType": "date" }
    SCHEMA

    assert_equal 'date', schema.logical_type
    today = Date.today
    assert_encode_and_decode today, schema
    assert_preencoded Avro::LogicalTypes::IntDate.encode(today), schema, today
  end

  def test_int_date_conversion
    type = Avro::LogicalTypes::IntDate

    assert_equal 5, type.encode(Date.new(1970, 1, 6))
    assert_equal 0, type.encode(Date.new(1970, 1, 1))
    assert_equal(-5, type.encode(Date.new(1969, 12, 27)))

    assert_equal Date.new(1970, 1, 6), type.decode(5)
    assert_equal Date.new(1970, 1, 1), type.decode(0)
    assert_equal Date.new(1969, 12, 27), type.decode(-5)
  end

  def test_timestamp_millis_long
    schema = Avro::Schema.parse <<-SCHEMA
      { "type": "long", "logicalType": "timestamp-millis" }
    SCHEMA

    # The Time.at format is (seconds, microseconds) since Epoch.
    time = Time.at(628232400, 12000)

    assert_equal 'timestamp-millis', schema.logical_type
    assert_encode_and_decode time, schema
    assert_preencoded Avro::LogicalTypes::TimestampMillis.encode(time), schema, time.utc
  end

  def test_timestamp_millis_long_conversion
    type = Avro::LogicalTypes::TimestampMillis

    now = Time.now.utc
    now_millis = Time.utc(now.year, now.month, now.day, now.hour, now.min, now.sec, now.usec / 1000 * 1000)

    assert_equal now_millis, type.decode(type.encode(now_millis))
    assert_equal 1432849613221, type.encode(Time.utc(2015, 5, 28, 21, 46, 53, 221000))
    assert_equal 1432849613221, type.encode(DateTime.new(2015, 5, 28, 21, 46, 53.221))
    assert_equal Time.utc(2015, 5, 28, 21, 46, 53, 221000), type.decode(1432849613221)
  end

  def test_timestamp_micros_long
    schema = Avro::Schema.parse <<-SCHEMA
      { "type": "long", "logicalType": "timestamp-micros" }
    SCHEMA

    # The Time.at format is (seconds, microseconds) since Epoch.
    time = Time.at(628232400, 12345)

    assert_equal 'timestamp-micros', schema.logical_type
    assert_encode_and_decode time, schema
    assert_preencoded Avro::LogicalTypes::TimestampMicros.encode(time), schema, time.utc
  end

  def test_timestamp_micros_long_conversion
    type = Avro::LogicalTypes::TimestampMicros

    now = Time.now.utc

    assert_equal Time.utc(now.year, now.month, now.day, now.hour, now.min, now.sec, now.usec), type.decode(type.encode(now))
    assert_equal 1432849613221843, type.encode(Time.utc(2015, 5, 28, 21, 46, 53, 221843))
    assert_equal 1432849613221843, type.encode(DateTime.new(2015, 5, 28, 21, 46, 53.221843))
    assert_equal Time.utc(2015, 5, 28, 21, 46, 53, 221843), type.decode(1432849613221843)
  end

  def test_parse_fixed_duration
    schema = Avro::Schema.parse <<-SCHEMA
      { "type": "fixed", "size": 12, "name": "fixed_dur", "logicalType": "duration" }
    SCHEMA

    assert_equal 'duration', schema.logical_type
  end

  def encode(datum, schema)
    buffer = StringIO.new("")
    encoder = Avro::IO::BinaryEncoder.new(buffer)

    datum_writer = Avro::IO::DatumWriter.new(schema)
    datum_writer.write(datum, encoder)

    buffer.string
  end

  def decode(encoded, schema)
    buffer = StringIO.new(encoded)
    decoder = Avro::IO::BinaryDecoder.new(buffer)

    datum_reader = Avro::IO::DatumReader.new(schema, schema)
    datum_reader.read(decoder)
  end

  def assert_encode_and_decode(datum, schema)
    encoded = encode(datum, schema)
    assert_equal datum, decode(encoded, schema)
  end

  def assert_preencoded(datum, schema, decoded)
    encoded = encode(datum, schema)
    assert_equal decoded, decode(encoded, schema)
  end
end

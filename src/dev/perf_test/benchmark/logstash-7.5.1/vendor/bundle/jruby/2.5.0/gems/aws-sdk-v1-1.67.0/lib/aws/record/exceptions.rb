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
  module Record

    # @api private
    class RecordNotFound < StandardError; end

    # Raised when trying to access an attribute that does not exist.
    # @api private
    class UndefinedAttributeError < StandardError
      def initalize attribute_name
        super("undefined attribute `#{attribute_name}`")
      end
    end

    # Raised when calling #save!, #create! or #update_attributes! on a record that
    # has validation errors.
    # @api private
    class InvalidRecordError < StandardError
      def initialize record
        @record = record
        super(record.errors.full_messages.join(', '))
      end
      attr_reader :record
    end

    # Raised when trying to persist a record that has no attribute values
    # to persist.
    # @api private
    class EmptyRecordError < StandardError
      def initialize record
        @record = record
        super('unable persist empty records')
      end
      attr_reader :record
    end

  end
end

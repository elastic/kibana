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
  module Core

    # This trival wrapper around File provides an easy way for the client to know when
    # the file that it just streamed over HTTP should be closed after receiving the
    # response.  This should only be used internally to track files that we opened.
    # Open files passed into upload methods should be closed by the user.
    # @api private
    class ManagedFile < File

      def self.open path
        file_opts = ['rb']
        file_opts << { :encoding => "BINARY" } if Object.const_defined?(:Encoding)
        super(path.to_s, *file_opts)
      end

    end
  end
end

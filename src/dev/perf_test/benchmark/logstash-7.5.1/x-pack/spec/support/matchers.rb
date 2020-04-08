# Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
# or more contributor license agreements. Licensed under the Elastic License;
# you may not use this file except in compliance with the Elastic License.

RSpec::Matchers.define :have_registered_hook do |emitter_scope, klass|
  match do |hooks|
    hooks.registered_hook?(emitter_scope, klass)
  end

  failure_message do
    "HooksRegistry doesn't contains a hook named `#{klass}` for the specified emitter scope: `#{emitter_scope}`"
  end
end

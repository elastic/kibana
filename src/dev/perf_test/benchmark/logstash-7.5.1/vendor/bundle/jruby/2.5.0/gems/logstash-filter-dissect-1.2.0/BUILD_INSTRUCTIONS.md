These instructions are for the JAVA build NOT Ruby Gem build and publish.

#### History
This is a Logstash plugin with a large amount of Java code.

The Java source is dependent on the logstash-core jar and the logstash-core-event jar.
These jars can be found in the gems that are resolved via the `s.add_runtime_dependency "logstash-core-plugin-api", "~> 2.0"` line in the gemspec.
So different versions of these gems can be installed as time goes by. The gradle build dependencies cannot refer to a static location and version.

These Rake tasks allow for Gradle to be dependent on Rubygems.
- `rake vendor` - this task calls "./gradlew vendor" but only after have done the "bundle_install" rake task
- `rake bundle_install` - this task calls `bundle install` then puts the output of `bundle show logstash-core` and `bundle show logstash-core-event` into the "gradle.properties" file.

#### Procedure
Each time a new gem version of `logstash-core-plugin-api` is released we need to run `rake vendor` to verify that any changes to the Java in logstash-core and logstash-core-event are still compatible with their usage in this plugin.

Run `rake vendor`

#### Travis
Travis is set to use `rake write_gradle_properties` before its build task

#### More Information
See the Gradle "vendor" task to understand how the the jar is generated.
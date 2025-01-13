## File service integration tests

The set of tests for File Service integration should cover all file service
functionality. These tests run against an actual Kibana and ES.

File service is the top-level entry-point for working with files. These integration
tests are closer to functional tests for all of Blob store service, file objects,
file sharing service and file service itself.

These tests do not include HTTP endpoint tests.

[Missing the other part of the readme]

## Running the tests

```
bundle install
bundle exec rspec
```

If you want to run the integration test against a real bucket you need to pass
your aws credentials to the test runner or declare it in your environment.

```
AWS_REGION=us-east-1 AWS_ACCESS_KEY_ID=123 AWS_SECRET_ACCESS_KEY=secret AWS_LOGSTASH_TEST_BUCKET=mytest bundle exec rspec spec/integration/s3_spec.rb --tag integration
```

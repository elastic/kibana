# AWS SDK for Ruby - Version 1 [![Build Status](https://travis-ci.org/aws/aws-sdk-ruby.svg?branch=aws-sdk-v1)](https://travis-ci.org/aws/aws-sdk-ruby)

This is version 1 of the AWS SDK for Ruby. **Version 2 can be found in the
[master branch](https://github.com/aws/aws-sdk-ruby).**

## Installation

Version 1 of the AWS SDK for Ruby is available on rubygems.org as two gems:

* `aws-sdk-v1`
* `aws-sdk`

This project uses [semantic versioning](http://semver.org/). If you are using the
`aws-sdk` gem, we strongly recommend you specify a version constraint in
your Gemfile. Version 2 of the Ruby SDK will not be backwards compatible
with version 1.

    # version constraint
    gem 'aws-sdk', '< 2'

    # or use the v1 gem
    gem 'aws-sdk-v1'

If you use the `aws-sdk-v1` gem, you may also load the v2 Ruby SDK in the
same process; The v2 Ruby SDK uses a different namespace, making this possible.

    # when the v2 SDK ships, you will be able to do the following
    gem 'aws-sdk', '~> 2.0'
    gem 'aws-sdk-v1'

If you are currently using v1 of `aws-sdk` and you update to `aws-sdk-v1`, you
may need to change how you require the Ruby SDK:

    require 'aws-sdk-v1' # not 'aws-sdk'

If you are using a version of Ruby older than 1.9, you may encounter problems with Nokogiri.
The authors dropped support for Ruby 1.8.x in Nokogiri 1.6. To use aws-sdk, you'll also have
to install or specify a version of Nokogiri prior to 1.6, like this:

    gem 'nokogiri', '~> 1.5.0'

## Basic Configuration

You need to provide your AWS security credentials and choose a default region.

```
AWS.config(access_key_id: '...', secret_access_key: '...', region: 'us-west-2')
```

You can also specify these values via `ENV`:

    export AWS_ACCESS_KEY_ID='...'
    export AWS_SECRET_ACCESS_KEY='...'
    export AWS_REGION='us-west-2'

## Basic Usage

Each service provides a service interface and a client.

```
ec2 = AWS.ec2 #=> AWS::EC2
ec2.client #=> AWS::EC2::Client
```

The client provides one method for each API operation.  The client methods
accept a hash of request params and return a response with a hash of
response data. The service interfaces provide a higher level abstration built using the client.

**Example: list instance tags using a client**

```
resp = ec2.client.describe_tags(filters: [{ name: "resource-id", values: ["i-12345678"] }])
resp[:tag_set].first
#=> {:resource_id=>"i-12345678", :resource_type=>"instance", :key=>"role", :value=>"web"}
```

**Example: list instance tags using the AWS::EC2 higher level interface**

```
ec2.instances['i-12345678'].tags.to_h
#=> {"role"=>"web"}
```

See the [API Documentation](http://docs.aws.amazon.com/AWSRubySDK/latest/frames.html) for more examples.

## Testing

All HTTP requests to live services can be globally mocked (e.g. from within the `spec_helper.rb` file):

```
AWS.stub!
```

## Links of Interest

* [API Documentation](http://docs.aws.amazon.com/AWSRubySDK/latest/frames.html)
* [Release Notes](http://aws.amazon.com/releasenotes/Ruby)
* [Issues](http://github.com/aws/aws-sdk-ruby/issues)
* [Forums](https://forums.aws.amazon.com/forum.jspa?forumID=125)
* [License](http://aws.amazon.com/apache2.0/)

## Supported Services

The SDK currently supports the following services:

  <table class="supported-services" border="1">
    <thead>
      <th>Class</th>
      <th>API Version</th>
      <th>AWS Service Name</th>
    </thead>
    <tbody>
      <tr>
      <td>AWS::AutoScaling</td>
      <td>2011-01-01</td>
      <td>Auto Scaling</td>
    </tr>
    <tr>
      <td>AWS::CloudFormation</td>
      <td>2010-05-15</td>
      <td>AWS CloudFormation</td>
    </tr>
    <tr>
      <td rowspan="9">AWS::CloudFront</td>
      <td>2013-05-12</td>
      <td rowspan="9">Amazon CloudFront</td>
    </tr>
    <tr>
      <td>2013-08-26</td>
    </tr>
    <tr>
      <td>2013-09-27</td>
    </tr>
    <tr>
      <td>2013-11-11</td>
    </tr>
    <tr>
      <td>2013-11-22</td>
    </tr>
    <tr>
      <td>2014-01-31</td>
    </tr>
    <tr>
      <td>2014-05-31</td>
    </tr>
    <tr>
      <td>2014-10-21</td>
    </tr>
    <tr>
      <td>2014-11-06</td>
    </tr>
    <tr>
      <td rowspan="2">AWS::CloudSearch</td>
      <td>2011-02-01</td>
      <td rowspan="2">Amazon CloudSearch</td>
    </tr>
    <tr>
      <td>2013-01-01</td>
    </tr>
    <tr>
      <td>AWS::CloudTrail</td>
      <td>2013-11-01</td>
      <td>AWS CloudTrail</td>
    </tr>
    <tr>
      <td>AWS::CloudWatch</td>
      <td>2010-08-01</td>
      <td>Amazon CloudWatch</td>
    </tr>
    <tr>
      <td>AWS::DataPipeline</td>
      <td>2012-10-29</td>
      <td>AWS Data Pipeline</td>
    </tr>
    <tr>
      <td>AWS::DirectConnect</td>
      <td>2012-10-25</td>
      <td>AWS Direct Connect</td>
    </tr>
    <tr>
      <td rowspan="2">AWS::DynamoDB</td>
      <td>2011-12-05</td>
      <td rowspan="2">Amazon DynamoDB</td>
    </tr>
    <tr>
      <td>2012-08-10</td>
    </tr>
    <tr>
      <td rowspan="7">AWS::EC2</td>
      <td>2013-08-15</td>
      <td rowspan="7">Amazon Elastic Compute Cloud</td>
    </tr>
    <tr>
      <td>2013-10-01</td>
    </tr>
    <tr>
      <td>2013-10-15</td>
    </tr>
    <tr>
      <td>2014-02-01</td>
    </tr>
    <tr>
      <td>2014-05-01</td>
    </tr>
    <tr>
      <td>2014-09-01</td>
    </tr>
    <tr>
      <td>2014-10-01</td>
    </tr>
    <tr>
      <td rowspan="4">AWS::ElastiCache</td>
      <td>2013-06-15</td>
      <td rowspan="4">Amazon ElastiCache</td>
    </tr>
    <tr>
      <td>2014-03-24</td>
    </tr>
    <tr>
      <td>2014-07-15</td>
    </tr>
    <tr>
      <td>2014-09-30</td>
    </tr>
    <tr>
      <td>AWS::ElasticBeanstalk</td>
      <td>2010-12-01</td>
      <td>AWS Elastic Beanstalk</td>
    </tr>
    <tr>
      <td>AWS::ElasticTranscoder</td>
      <td>2012-09-25</td>
      <td>Amazon Elastic Transcoder</td>
    </tr>
    <tr>
      <td>AWS::ELB</td>
      <td>2012-06-01</td>
      <td>Elastic Load Balancing</td>
    </tr>
    <tr>
      <td>AWS::EMR</td>
      <td>2009-03-31</td>
      <td>Amazon Elastic MapReduce</td>
    </tr>
    <tr>
      <td>AWS::Glacier</td>
      <td>2012-06-01</td>
      <td>Amazon Glacier</td>
    </tr>
    <tr>
      <td>AWS::IAM</td>
      <td>2010-05-08</td>
      <td>AWS Identity and Access Management</td>
    </tr>
    <tr>
      <td>AWS::ImportExport</td>
      <td>2010-06-01</td>
      <td>AWS Import/Export</td>
    </tr>
    <tr>
      <td>AWS::Kinesis</td>
      <td>2013-12-02</td>
      <td>Amazon Kinesis</td>
    </tr>
    <tr>
      <td>AWS::OpsWorks</td>
      <td>2013-02-18</td>
      <td>AWS OpsWorks</td>
    </tr>
    <tr>
      <td rowspan="3">AWS::RDS</td>
      <td>2013-05-15</td>
      <td rowspan="3">Amazon Relational Database Service (Beta)</td>
    </tr>
    <tr>
      <td>2013-09-09</td>
    </tr>
    <tr>
      <td>2014-09-01</td>
    </tr>
    <tr>
      <td>AWS::Redshift</td>
      <td>2012-12-01</td>
      <td>Amazon Redshift</td>
    </tr>
    <tr>
      <td rowspan="2">AWS::Route53</td>
      <td>2012-12-12</td>
      <td rowspan="2">Amazon Route 53</td>
    </tr>
    <tr>
      <td>2013-04-01</td>
    </tr>
    <tr>
      <td>AWS::S3</td>
      <td>2006-03-01</td>
      <td>Amazon Simple Storage Service</td>
    </tr>
    <tr>
      <td>AWS::SimpleDB</td>
      <td>2009-04-15</td>
      <td>Amazon SimpleDB</td>
    </tr>
    <tr>
      <td>AWS::SimpleEmailService</td>
      <td>2010-12-01</td>
      <td>Amazon Simple E-mail Service</td>
    </tr>
    <tr>
      <td>AWS::SimpleWorkflow</td>
      <td>2012-01-25</td>
      <td>Amazon Simple Workflow Service</td>
    </tr>
    <tr>
      <td>AWS::SNS</td>
      <td>2010-03-31</td>
      <td>Amazon Simple Notifications Service</td>
    </tr>
    <tr>
      <td>AWS::SQS</td>
      <td>2012-11-05</td>
      <td>Amazon Simple Queue Service</td>
    </tr>
    <tr>
      <td rowspan="2">AWS::StorageGateway</td>
      <td>2012-06-30</td>
      <td rowspan="2">AWS Storage Gateway</td>
    </tr>
    <tr>
      <td>2013-06-30</td>
    </tr>
    <tr>
      <td>AWS::STS</td>
      <td>2011-06-15</td>
      <td>AWS Security Token Service</td>
    </tr>
    <tr>
      <td>AWS::Support</td>
      <td>2013-04-15</td>
      <td>AWS Support</td>
    </tr>
    </tbody>
  </table>

## License

This SDK is distributed under the
[Apache License, Version 2.0](http://www.apache.org/licenses/LICENSE-2.0).

```no-highlight
Copyright 2012. Amazon Web Services, Inc. All Rights Reserved.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
```

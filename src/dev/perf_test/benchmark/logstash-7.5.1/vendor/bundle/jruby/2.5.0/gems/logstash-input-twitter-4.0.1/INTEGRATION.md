### Attn: Logstash Team

To run integration tests locally, you will need to add a file called `integration_credentials.rb` to the spec folder.

This file is in gitignore.

The contents should contain this:
```
if !defined?(ENV)
  ENV = {}
end

ENV['PUB_TWITTER_CONSUMER_KEY'] = '...'
ENV['PUB_TWITTER_CONSUMER_SECRET'] = '...'
ENV['PUB_TWITTER_OAUTH_TOKEN'] = '...'
ENV['PUB_TWITTER_OAUTH_TOKEN_SECRET'] = '...'

ENV['TWITTER_CONSUMER_KEY'] = '...'
ENV['TWITTER_CONSUMER_SECRET'] = '...'
ENV['TWITTER_OAUTH_TOKEN'] = '...'
ENV['TWITTER_OAUTH_TOKEN_SECRET'] = '...'

ENV['CREDS_LOADED'] = 'twitter integration creds are loaded'
```

Use the information in the Elastic WIKI at DEV Logstash Twitter: Integration keys for logstash-input-twitter
to fill in the `...` blanks.

LogstashCiPub maps to 'PUB_TWITTER\*'

LogstashCiSub maps to 'TWITTER\*'

The spec_helper has been changed to run the integration tests as well if this file is present.

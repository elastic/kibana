[![Version     ](https://img.shields.io/gem/v/bundler.svg?style=flat)](https://rubygems.org/gems/bundler)
[![Build Status](https://img.shields.io/travis/bundler/bundler/master.svg?style=flat)](https://travis-ci.org/bundler/bundler)
[![Code Climate](https://img.shields.io/codeclimate/github/bundler/bundler.svg?style=flat)](https://codeclimate.com/github/bundler/bundler)
[![Inline docs ](http://inch-ci.org/github/bundler/bundler.svg?style=flat)](http://inch-ci.org/github/bundler/bundler)
[![Slack       ](http://bundler-slackin.herokuapp.com/badge.svg)](http://bundler-slackin.herokuapp.com)

# Bundler: a gem to bundle gems

Bundler makes sure Ruby applications run the same code on every machine.

It does this by managing the gems that the application depends on. Given a list of gems, it can automatically download and install those gems, as well as any other gems needed by the gems that are listed. Before installing gems, it checks the versions of every gem to make sure that they are compatible, and can all be loaded at the same time. After the gems have been installed, Bundler can help you update some or all of them when new versions become available. Finally, it records the exact versions that have been installed, so that others can install the exact same gems.

### Installation and usage

To install (or update to the latest version):

```
gem install bundler
```

To install a prerelease version (if one is available), run `gem install bundler --pre`. To uninstall Bundler, run `gem uninstall bundler`.

Bundler is most commonly used to manage your application's dependencies. For example, these commands will allow you to use Bundler to manage the `rspec` gem for your application:

```
bundle init
bundle add rspec
bundle install
bundle exec rspec
```

See [bundler.io](http://bundler.io) for the full documentation.

### Troubleshooting

For help with common problems, see [TROUBLESHOOTING](doc/TROUBLESHOOTING.md).

Still stuck? Try [filing an issue](doc/contributing/ISSUES.md).

### Other questions

To see what has changed in recent versions of Bundler, see the [CHANGELOG](CHANGELOG.md).

To get in touch with the Bundler core team and other Bundler users, please see [getting help](doc/contributing/GETTING_HELP.md).

### Contributing

If you'd like to contribute to Bundler, that's awesome, and we <3 you. There's a guide to contributing to Bundler (both code and general help) over in [our documentation section](doc/README.md).

While some Bundler contributors are compensated by Ruby Together, the project maintainers make decisions independent of Ruby Together. As a project, we welcome contributions regardless of the author’s affiliation with Ruby Together.

### Supporting

<a href="https://rubytogether.org/"><img src="https://rubytogether.org/images/rubies.svg" width="150"></a><br>
<a href="https://rubytogether.org/">Ruby Together</a> pays some Bundler maintainers for their ongoing work. As a grassroots initiative committed to supporting the critical Ruby infrastructure you rely on, Ruby Together is funded entirely by the Ruby community. Contribute today <a href="https://rubytogether.org/developers">as an individual</a> or (better yet) <a href="https://rubytogether.org/companies">as a company</a> to ensure that Bundler, RubyGems, and other shared tooling is around for years to come.

### Code of Conduct

Everyone interacting in the Bundler project’s codebases, issue trackers, chat rooms, and mailing lists is expected to follow the [Bundler code of conduct](https://github.com/bundler/bundler/blob/master/CODE_OF_CONDUCT.md).

### License

[MIT License](https://github.com/bundler/bundler/blob/master/LICENSE.md)

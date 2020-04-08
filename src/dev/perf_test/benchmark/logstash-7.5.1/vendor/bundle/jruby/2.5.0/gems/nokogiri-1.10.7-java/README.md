# Nokogiri

## Description

Nokogiri (鋸) is an HTML, XML, SAX, and Reader parser.  Among
Nokogiri's many features is the ability to search documents via XPath
or CSS3 selectors.


## Links

* https://nokogiri.org
* [Installation Help](https://nokogiri.org/tutorials/installing_nokogiri.html)
* [Tutorials](https://nokogiri.org)
* [Cheat Sheet](https://github.com/sparklemotion/nokogiri/wiki/Cheat-sheet)
* [GitHub](https://github.com/sparklemotion/nokogiri)
* [Mailing List](https://groups.google.com/group/nokogiri-talk)
* [Chat/Gitter](https://gitter.im/sparklemotion/nokogiri)


## Status

[![Concourse CI](https://ci.nokogiri.org/api/v1/teams/nokogiri-core/pipelines/nokogiri/jobs/ruby-2.4-system/badge)](https://ci.nokogiri.org/teams/nokogiri-core/pipelines/nokogiri)
[![Appveyor CI](https://ci.appveyor.com/api/projects/status/xj2pqwvlxwuwgr06/branch/master?svg=true)](https://ci.appveyor.com/project/flavorjones/nokogiri/branch/master)
[![Code Climate](https://codeclimate.com/github/sparklemotion/nokogiri.svg)](https://codeclimate.com/github/sparklemotion/nokogiri)
[![Test Coverage](https://api.codeclimate.com/v1/badges/59c67b0e8976027a45ad/test_coverage)](https://codeclimate.com/github/sparklemotion/nokogiri/test_coverage)

[![Gem Version](https://badge.fury.io/rb/nokogiri.svg)](https://rubygems.org/gems/nokogiri)
[![SemVer compatibility](https://api.dependabot.com/badges/compatibility_score?dependency-name=nokogiri&package-manager=bundler&version-scheme=semver)](https://dependabot.com/compatibility-score.html?dependency-name=nokogiri&package-manager=bundler&version-scheme=semver)
[![Tidelift dependencies](https://tidelift.com/badges/github/sparklemotion/nokogiri)](https://tidelift.com/subscription/pkg/rubygems-nokogiri?utm_source=rubygems-nokogiri&utm_medium=referral&utm_campaign=readme)


## Features

* XML/HTML DOM parser which handles broken HTML
* XML/HTML SAX parser
* XML/HTML Push parser
* XPath 1.0 support for document searching
* CSS3 selector support for document searching
* XML/HTML builder
* XSLT transformer

Nokogiri parses and searches XML/HTML using native libraries (either C
or Java, depending on your Ruby), which means it's fast and
standards-compliant.


## Installation

If this doesn't work:

```
gem install nokogiri
```

then please start troubleshooting here:

> https://nokogiri.org/tutorials/installing_nokogiri.html

There are currently 1,237 Stack Overflow questions about Nokogiri
installation. The vast majority of them are out of date and therefore
incorrect. __Please do not use Stack Overflow.__

Instead, [tell us](https://nokogiri.org/tutorials/getting_help.html)
when the above instructions don't work for you. This allows us to both
help you directly and improve the documentation.


### Binary packages

Binary packages are available for some distributions.

* Debian: https://packages.debian.org/sid/ruby-nokogiri
* SuSE: https://download.opensuse.org/repositories/devel:/languages:/ruby:/extensions/
* Fedora: http://s390.koji.fedoraproject.org/koji/packageinfo?packageID=6756


## Support

All official documentation is posted at https://nokogiri.org (the source for which is at https://github.com/sparklemotion/nokogiri.org/, and we welcome contributions).

* The Nokogiri mailing list is active: https://groups.google.com/group/nokogiri-talk
* The Nokogiri bug tracker is here: https://github.com/sparklemotion/nokogiri/issues
* Before filing a bug report, please read our submission guidelines: http://nokogiri.org/tutorials/getting_help.html
* The IRC channel is `#nokogiri` on freenode.
* The project's GitHub wiki has an excellent community-maintained [Cheat Sheet](https://github.com/sparklemotion/nokogiri/wiki/Cheat-sheet) which might be useful.

Consider subscribing to [Tidelift][tidelift] which provides license assurances and timely security notifications for your open source dependencies, including Nokogiri. [Tidelift][tidelift] subscriptions also help the Nokogiri maintainers fund our [automated testing](https://ci.nokogiri.org) which in turn allows us to ship releases, bugfixes, and security updates more often.

  [tidelift]: https://tidelift.com/subscription/pkg/rubygems-nokogiri?utm_source=rubygems-nokogiri&utm_medium=referral&utm_campaign=readme


## Security and Vulnerability Reporting

Please report vulnerabilities at https://hackerone.com/nokogiri

Full information and description of our security policy is in [`SECURITY.md`](SECURITY.md)


## Synopsis

Nokogiri is a large library, but here is example usage for parsing and examining a document:

```ruby
#! /usr/bin/env ruby

require 'nokogiri'
require 'open-uri'

# Fetch and parse HTML document
doc = Nokogiri::HTML(open('https://nokogiri.org/tutorials/installing_nokogiri.html'))

puts "### Search for nodes by css"
doc.css('nav ul.menu li a', 'article h2').each do |link|
  puts link.content
end

puts "### Search for nodes by xpath"
doc.xpath('//nav//ul//li/a', '//article//h2').each do |link|
  puts link.content
end

puts "### Or mix and match."
doc.search('nav ul.menu li a', '//article//h2').each do |link|
  puts link.content
end
```


## Requirements

* Ruby 2.3.0 or higher, including any development packages necessary
  to compile native extensions.

* In Nokogiri 1.6.0 and later libxml2 and libxslt are bundled with the
  gem, but if you want to use the system versions:

  * First, check out [the long list](http://www.xmlsoft.org/news.html)
    of fixes and changes between releases before deciding to use any
    version older than is bundled with Nokogiri.

  * At install time, set the environment variable
    `NOKOGIRI_USE_SYSTEM_LIBRARIES` or else use the
    `--use-system-libraries` argument. (See
    https://nokogiri.org/tutorials/installing_nokogiri.html#install-with-system-libraries
    for specifics.)

  * libxml2 >=2.6.21 with iconv support
    (libxml2-dev/-devel is also required)

  * libxslt, built with and supported by the given libxml2
    (libxslt-dev/-devel is also required)


## Encoding

Strings are always stored as UTF-8 internally.  Methods that return
text values will always return UTF-8 encoded strings.  Methods that
return a string containing markup (like `to_xml`, `to_html` and
`inner_html`) will return a string encoded like the source document.

__WARNING__

Some documents declare one encoding, but actually use a different
one. In these cases, which encoding should the parser choose?

Data is just a stream of bytes. Humans add meaning to that stream. Any
particular set of bytes could be valid characters in multiple
encodings, so detecting encoding with 100% accuracy is not
possible. `libxml2` does its best, but it can't be right all the time.

If you want Nokogiri to handle the document encoding properly, your
best bet is to explicitly set the encoding.  Here is an example of
explicitly setting the encoding to EUC-JP on the parser:

```ruby
  doc = Nokogiri.XML('<foo><bar /></foo>', nil, 'EUC-JP')
```


## Development

```bash
  bundle install
  bundle exec rake compile test
```


## Code of Conduct

We've adopted the Contributor Covenant code of conduct, which you can read in full in [`CODE_OF_CONDUCT.md`](CODE_OF_CONDUCT.md).


## License

This project is licensed under the terms of the MIT license.

See this license at [`LICENSE.md`](LICENSE.md).

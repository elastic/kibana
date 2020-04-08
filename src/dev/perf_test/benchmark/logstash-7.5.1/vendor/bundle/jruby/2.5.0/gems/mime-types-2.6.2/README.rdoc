= mime-types

home :: https://github.com/mime-types/ruby-mime-types/
code :: https://github.com/mime-types/ruby-mime-types/
bugs :: https://github.com/mime-types/ruby-mime-types/issues
rdoc :: http://rdoc.info/gems/mime-types/
continuous integration :: {<img src="https://travis-ci.org/mime-types/ruby-mime-types.png" />}[https://travis-ci.org/mime-types/ruby-mime-types]
test coverage :: {<img src="https://coveralls.io/repos/mime-types/ruby-mime-types/badge.png" alt="Coverage Status" />}[https://coveralls.io/r/mime-types/ruby-mime-types]

== Description

The mime-types library provides a library and registry for information about
MIME content type definitions. It can be used to determine defined filename
extensions for MIME types, or to use filename extensions to look up the likely
MIME type definitions.

MIME content types are used in MIME-compliant communications, as in e-mail or
HTTP traffic, to indicate the type of content which is transmitted. The
mime-types library provides the ability for detailed information about MIME
entities (provided as an enumerable collection of MIME::Type objects) to be
determined and used. There are many types defined by RFCs and vendors, so the
list is long but by definition incomplete; don't hesitate to add additional
type definitions. MIME type definitions found in mime-types are from RFCs, W3C
recommendations, the {IANA Media Types
registry}[https://www.iana.org/assignments/media-types/media-types.xhtml], and
user contributions. It conforms to RFCs 2045 and 2231.

This is release 2.6 with two new experimental features. The first new feature
is a new default registry storage format that greatly reduces the initial
memory use of the mime-types library. This feature is enabled by requiring
+mime/types/columnar+ instead of +mime/types+ with a small performance cost and
no change in *total* memory use if certain methods are called (see {Columnar
Store}[#label-Columnar+Store]). The second new feature is a logger interface
that conforms to the expectations of an ActiveSupport::Logger so that warnings
can be written to an application's log rather than the default location for
+warn+. This interface may be used for other logging purposes in the future.

mime-types 2.6 is the last planned version of mime-types 2.x, so deprecation
warnings are no longer cached but provided every time the method is called.
mime-types 2.6 supports Ruby 1.9.2 or later.

=== mime-types 1.x End of Life

mime-types 2.0 was released in late 2013, and as of early 2015 there have been
no reported security issues for mime-types 1.x. With the release of mime-types
2.5, I set the formal End of Life for mime-types 1.x for 2015-10-27 (the second
anniversary of the release of mime-types 2.0). After this date, absolutely no
pull requests for mime-types 1.x will be accepted.

=== mime-types Future

There are a number of issues open that make clear to me that there are some
fundamental changes that need to happen to both the data representation and the
API provided by mime-types. This cannot happen under the current release, so
all new development is focussing on an upcoming 3.0 release. The target for the
release is on or before the beginning of RubyConf 2015 (2015-11-15).

When 3.0 is released, mime-types 2.x will receive regular updates of the IANA
registry for two years following the release. It will also receive security
updates, if needed, for the same period. There will be no further feature
development on mime-types 2.x following the 3.0 release.

Coincident with the 3.0 release, I will release mime-types 2.99.0 that no
longer imports the data to fields that have been deprecated, or exports it if
it is present. If they work because they derive data from the data that is
still present, the will continue to work. The quarterly updates will be against
2.99.x.

If the possible loss of this deprecated data matters, be sure to set your
dependency appropriately:

   gem 'mime-types', '~> 2.6, < 2.99'

== Synopsis

MIME types are used in MIME entities, as in email or HTTP traffic. It is useful
at times to have information available about MIME types (or, inversely, about
files). A MIME::Type stores the known information about one MIME type.

   require 'mime/types'

   plaintext = MIME::Types['text/plain'] # => [ text/plain ]
   text = plaintext.first
   puts text.media_type            # => 'text'
   puts text.sub_type              # => 'plain'

   puts text.extensions.join(' ')  # => 'txt asc c cc h hh cpp hpp dat hlp'
   puts text.preferred_extension   # => 'txt'
   puts text.friendly              # => 'Text Document'
   puts text.i18n_key              # => 'text.plain'

   puts text.encoding              # => quoted-printable
   puts text.default_encoding      # => quoted-printable
   puts text.binary?               # => false
   puts text.ascii?                # => true
   puts text.obsolete?             # => false
   puts text.registered?           # => true
   puts text.complete?             # => true

   puts text                       # => 'text/plain'

   puts text == 'text/plain'       # => true
   puts 'text/plain' == text       # => true
   puts text == 'text/x-plain'     # => false
   puts 'text/x-plain' == text     # => false

   puts MIME::Type.simplified('x-appl/x-zip') # => 'appl/zip'
   puts MIME::Type.i18n_key('x-appl/x-zip') # => 'appl.zip'

   puts text.like?('text/x-plain') # => true
   puts text.like?(MIME::Type.new('x-text/x-plain')) # => true

   puts text.xrefs.inspect # => { "rfc" => [ "rfc2046", "rfc3676", "rfc5147" ] }
   puts text.urls # => [ "http://www.iana.org/go/rfc2046",
                  #      "http://www.iana.org/go/rfc3676",
                  #      "http://www.iana.org/go/rfc5147" ]

   xtext = MIME::Type.new('x-text/x-plain')
   puts xtext.media_type # => 'text'
   puts xtext.raw_media_type # => 'x-text'
   puts xtext.sub_type # => 'plain'
   puts xtext.raw_sub_type # => 'x-plain'
   puts xtext.complete? # => false

   puts MIME::Types.any? { |type| type.content_type == 'text/plain' } # => true
   puts MIME::Types.all?(&:registered?) # => false

   # Various string representations of MIME types
   qcelp = MIME::Types['audio/QCELP'].first # => audio/QCELP
   puts qcelp.content_type         # => 'audio/QCELP'
   puts qcelp.simplified           # => 'audio/qcelp'

   xwingz = MIME::Types['application/x-Wingz'].first # => application/x-Wingz
   puts xwingz.content_type        # => 'application/x-Wingz'
   puts xwingz.simplified          # => 'application/wingz'

=== Columnar Store

mime-types 2.6 has an experimental columnar storage format that reduces the
default memory footprint. It does this by selectively loading data. When a
registry is first loaded from a columnar store, only the canonical MIME type
and registered extensions will be loaded and the MIME type will be connected to
its registry. When extended data is required (including #registered, #obsolete,
#use_instead), that data is loaded from its own column file for all types in
the registry. This load is done with a Mutex to ensure that the types are
updated safely in a multithreaded environment.

Columnar storage is slated to become the default storage format for mime-types
3.0, but until that is released, the default is still to use the JSON storage
format. As such, columnar storage can only currently be loaded at an
application level with the following specification in the application Gemfile:

   gem 'mime-types', require: 'mime/types/columnar'

Projects that do not use Bundler, and libraries that wish to suggest this
behaviour to applications are encouraged to require this directly, but only if
you specify a dependency on mime-types 2.6.

   require 'mime/types/columnar'

Although this require will not be necessary after mime-types 3, it will work
through at least {version
4}[https://github.com/mime-types/ruby-mime-types/pull/96#issuecomment-100725400]
and possibly beyond.

Note that the new Columnar class (MIME::Type::Columnar) and module
(MIME::Types::Columnar) are considered private variant implementations of
MIME::Type and MIME::Types and the specific implementation should not be relied
upon by consumers of the mime-types library. Instead, depend on the public
implementations only.

=== Cached Storage

Since version 2.0, mime-types has supported a cache of MIME types based on
<tt>Marshal.dump</tt>. The cache is invalidated for each released version of
mime-types so that version 2.5 is not reused for version 2.6. If the
environment variable +RUBY_MIME_TYPES_CACHE+ is set to a cache file, mime-types
will attempt to load the MIME type registry from the cache file. If it cannot,
it will load the types normally and then saves the registry to the cache file.

The current mime-types cache is not compatible with the columnar storage
format. This will be resolved for mime-types 3.

== mime-types Modified Semantic Versioning

The mime-types library has one version number, but this single version number
tracks both API changes and registry data changes; this is not wholly
compatible with all aspects of {Semantic Versioning}[http://semver.org/];
removing a MIME type from the registry *could* be considered a breaking change
under some interpretations of semantic versioning (as lookups for that
particular type would no longer work by default).

mime-types uses a modified semantic versioning scheme. Given the version
MAJOR.MINOR:

1. If an incompatible API (code) change is made, the MAJOR version will be
   incremented, MINOR will be set to zero, and PATCH will be reset to the
   implied zero.

2. If an API (code) feature is added that does not break compatibilty OR if
   there are MIME types added, removed, or changed in the registry, the MINOR
   version will be incremented and PATCH will be reset to the implied zero.

3. If there is a bugfix to a feature added in the most recent MAJOR.MINOR
   release, OR if purely typographical errors are fixed in MIME types, the
   implied PATCH value will be incremented resulting in MAJOR.MINOR.PATCH.

In practical terms, there should be a MINOR release roughly monthly to track
updated or changed MIME types from the official IANA registry. This does not
indicate when new API features have been added, but all minor versions of
mime-types 2.x will be backwards compatible; the interfaces marked deprecated
will be removed in mime-types 3.x.

:include: Contributing.rdoc

:include: Licence.rdoc

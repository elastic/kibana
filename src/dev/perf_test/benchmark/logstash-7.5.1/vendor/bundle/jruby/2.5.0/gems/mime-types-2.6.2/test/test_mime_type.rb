# -*- ruby encoding: utf-8 -*-

require 'mime/types'
require 'minitest_helper'

class TestMIMEType < Minitest::Test
  def make(content_type)
    MIME::Type.new(content_type) { |mt| yield mt if block_given? }
  end

  def make_javascript
    make('application/javascript') do |js|
      js.friendly('en' => 'JavaScript')
      js.xrefs = {
        'rfc' => %w(rfc4239 rfc4239),
        'template' => %w(application/javascript)
      }
      js.encoding = '8bit'
      js.extensions = %w(js sj)
      assert_deprecated('MIME::Type#references=') do
        js.references = %w(IANA RFC4329 {application/javascript=http://www.iana.org/assignments/media-types/application/javascript})
      end
      js.registered = true

      yield js if block_given?
    end
  end

  def make_yaml_mime_type
    make('text/x-yaml') do |yaml|
      yaml.extensions = %w(yaml yml)
      yaml.encoding   = '8bit'
      yaml.system     = 'd9d172f608'
      yaml.friendly('en' => 'YAML Structured Document')
    end
  end

  def make_yaml_mime_type_with_docs
    make('text/x-yaml') do |yaml|
      yaml.extensions = %w(yaml yml)
      yaml.encoding   = '8bit'
      yaml.system     = 'd9d172f608'
      yaml.docs       = 'Test YAML'
    end
  end

  def setup
    @applzip = MIME::Type.new('x-appl/x-zip') { |t|
      t.extensions = %w(zip zp)
    }
  end

  def test_class_from_array
    yaml = nil
    assert_deprecated('MIME::Type.from_array') do
      yaml = MIME::Type.from_array(
        'text/x-yaml',
        %w(yaml yml),
        '8bit',
        'd9d172f608'
      )
    end
    assert_instance_of(MIME::Type, yaml)
    assert_equal('text/yaml', yaml.simplified)
    assert_deprecated('MIME::Type.from_array') do
      assert_raises(ArgumentError) { MIME::Type.from_array }
    end
  end

  def test_class_from_hash
    yaml = nil
    assert_deprecated('MIME::Type.from_hash') do
      yaml = MIME::Type.from_hash('Content-Type' => 'text/x-yaml',
                                  'Content-Transfer-Encoding' => '8bit',
                                  'System' => 'd9d172f608',
                                  'Extensions' => %w(yaml yml))
    end
    assert_instance_of(MIME::Type, yaml)
    assert_equal('text/yaml', yaml.simplified)
  end

  def test_class_from_mime_type
    zip2 = nil
    assert_deprecated('MIME::Type.from_mime_type') do
      zip2 = MIME::Type.from_mime_type(@applzip)
    end
    assert_instance_of(MIME::Type, @applzip)
    assert_equal('appl/zip', @applzip.simplified)
    refute_equal(@applzip.object_id, zip2.object_id)
  end

  def test_class_simplified
    assert_equal('text/plain', MIME::Type.simplified('text/plain'))
    assert_equal('image/jpeg', MIME::Type.simplified('image/jpeg'))
    assert_equal('application/msword', MIME::Type.simplified('application/x-msword'))
    assert_equal('text/vcard', MIME::Type.simplified('text/vCard'))
    assert_equal('application/pkcs7-mime', MIME::Type.simplified('application/pkcs7-mime'))
    assert_equal('xyz/abc', MIME::Type.simplified('x-xyz/abc'))
    assert_nil(MIME::Type.simplified('text'))
  end

  def test_class_i18n_key
    assert_equal('text.plain', MIME::Type.i18n_key('text/plain'))
    assert_equal('image.jpeg', MIME::Type.i18n_key('image/jpeg'))
    assert_equal('application.msword', MIME::Type.i18n_key('application/x-msword'))
    assert_equal('text.vcard', MIME::Type.i18n_key('text/vCard'))
    assert_equal('application.pkcs7-mime', MIME::Type.i18n_key('application/pkcs7-mime'))
    assert_equal('xyz.abc', MIME::Type.i18n_key('x-xyz/abc'))
    assert_nil(MIME::Type.i18n_key('text'))
  end

  def test_spaceship_compare # '<=>'
    assert(MIME::Type.new('text/plain') == MIME::Type.new('text/plain')) # rubocop:disable Lint/UselessComparison
    assert(MIME::Type.new('text/plain') != MIME::Type.new('image/jpeg'))
    assert(MIME::Type.new('text/plain') == 'text/plain')
    assert(MIME::Type.new('text/plain') != 'image/jpeg')
    assert(MIME::Type.new('text/plain') > MIME::Type.new('text/html'))
    assert(MIME::Type.new('text/plain') > 'text/html')
    assert(MIME::Type.new('text/html') < MIME::Type.new('text/plain'))
    assert(MIME::Type.new('text/html') < 'text/plain')
    assert('text/html' == MIME::Type.new('text/html'))
    assert('text/html' < MIME::Type.new('text/plain'))
    assert('text/plain' > MIME::Type.new('text/html'))
  end

  def test_ascii_eh
    assert(MIME::Type.new('text/plain').ascii?)
    refute(MIME::Type.new('image/jpeg').ascii?)
    refute(MIME::Type.new('application/x-msword').ascii?)
    assert(MIME::Type.new('text/vCard').ascii?)
    refute(MIME::Type.new('application/pkcs7-mime').ascii?)
    refute(@applzip.ascii?)
  end

  def test_binary_eh
    refute(MIME::Type.new('text/plain').binary?)
    assert(MIME::Type.new('image/jpeg').binary?)
    assert(MIME::Type.new('application/x-msword').binary?)
    refute(MIME::Type.new('text/vCard').binary?)
    assert(MIME::Type.new('application/pkcs7-mime').binary?)
    assert(@applzip.binary?)
  end

  def test_complete_eh
    yaml = make_yaml_mime_type
    assert(yaml.complete?)
    yaml.extensions = nil
    refute(yaml.complete?)
  end

  def test_content_type
    assert_equal('text/plain', MIME::Type.new('text/plain').content_type)
    assert_equal('image/jpeg', MIME::Type.new('image/jpeg').content_type)
    assert_equal('application/x-msword',
                 MIME::Type.new('application/x-msword').content_type)
    assert_equal('text/vCard', MIME::Type.new('text/vCard').content_type)
    assert_equal('application/pkcs7-mime',
                 MIME::Type.new('application/pkcs7-mime').content_type)
    assert_equal('x-appl/x-zip', @applzip.content_type)
    assert_equal('base64', @applzip.encoding)
  end

  def test_encoding
    assert_equal('quoted-printable', MIME::Type.new('text/plain').encoding)
    assert_equal('base64', MIME::Type.new('image/jpeg').encoding)
    assert_equal('base64', MIME::Type.new('application/x-msword').encoding)
    assert_equal('quoted-printable', MIME::Type.new('text/vCard').encoding)
    assert_equal('base64', MIME::Type.new('application/pkcs7-mime').encoding)
  end

  def test_encoding_equals
    yaml = make_yaml_mime_type
    assert_equal('8bit', yaml.encoding)
    yaml.encoding = 'base64'
    assert_equal('base64', yaml.encoding)
    yaml.encoding = :default
    assert_equal('quoted-printable', yaml.encoding)
    assert_raises(MIME::Type::InvalidEncoding) {
      yaml.encoding = 'binary'
    }
  end

  def test_default_encoding
    %w(text/plain text/html).each { |mt|
      assert_equal('quoted-printable', MIME::Type.new(mt).default_encoding)
    }
    %w(image/jpeg applicatoin/pkcs7-mime).each { |mt|
      assert_equal('base64', MIME::Type.new(mt).default_encoding)
    }
  end

  def test_docs
    yaml = make_yaml_mime_type_with_docs
    assert_equal('Test YAML', yaml.docs)
  end

  def test_docs_equals
    yaml = make_yaml_mime_type
    assert_equal [], yaml.docs
    yaml.docs = 'YAML docs'
    assert_equal('YAML docs', yaml.docs)
  end

  def test_eql?
    assert(MIME::Type.new('text/plain').eql?(MIME::Type.new('text/plain')))
    refute(MIME::Type.new('text/plain').eql?(MIME::Type.new('image/jpeg')))
    refute(MIME::Type.new('text/plain').eql?('text/plain'))
    refute(MIME::Type.new('text/plain').eql?('image/jpeg'))
  end

  def test_extensions
    yaml = make_yaml_mime_type
    assert_equal(%w(yaml yml), yaml.extensions)
    assert_equal(2, @applzip.extensions.size)
    assert_equal(%w(zip zp), @applzip.extensions)
  end

  def test_add_extensions
    expected = make_yaml_mime_type
    test_doc = make_yaml_mime_type
    test_doc.add_extensions(nil)
    assert_equal(expected.extensions, test_doc.extensions)
    test_doc.add_extensions('yaml')
    assert_equal(expected.extensions, test_doc.extensions)
    test_doc.add_extensions(%w(yaml))
    assert_equal(expected.extensions, test_doc.extensions)
    test_doc.add_extensions('yz')
    assert_equal(%w(yaml yml yz), test_doc.extensions)
  end

  def test_extensions_equals
    yaml = make_yaml_mime_type
    yaml.extensions = 'yaml'
    assert_equal(%w(yaml), yaml.extensions)

    yaml.extensions = %w(yaml yaml)
    assert_equal(%w(yaml), yaml.extensions)

    yaml.extensions = %w(yz yaml yz yml)
    assert_equal(%w(yz yaml yml), yaml.extensions)
  end

  def test_like_eh
    assert(MIME::Type.new('text/plain').like?(MIME::Type.new('text/plain')))
    assert(MIME::Type.new('text/plain').like?(MIME::Type.new('text/x-plain')))
    refute(MIME::Type.new('text/plain').like?(MIME::Type.new('image/jpeg')))
    assert(MIME::Type.new('text/plain').like?('text/plain'))
    assert(MIME::Type.new('text/plain').like?('text/x-plain'))
    refute(MIME::Type.new('text/plain').like?('image/jpeg'))
  end

  def test_media_type
    assert_equal('text', MIME::Type.new('text/plain').media_type)
    assert_equal('image', MIME::Type.new('image/jpeg').media_type)
    assert_equal('application', MIME::Type.new('application/x-msword').media_type)
    assert_equal('text', MIME::Type.new('text/vCard').media_type)
    assert_equal('application', MIME::Type.new('application/pkcs7-mime').media_type)
    assert_equal('chemical', MIME::Type.new('x-chemical/x-pdb').media_type)
    assert_equal('appl', @applzip.media_type)
  end

  def test_obsolete_eh
    type = MIME::Type.new('content-type' => 'test/type',
                          'obsolete'     => true)
    assert(type.obsolete?)
    refute(make_yaml_mime_type.obsolete?)
  end

  def test_obsolete_equals
    yaml = make_yaml_mime_type
    refute(yaml.obsolete?)
    yaml.obsolete = true
    assert(yaml.obsolete?)
  end

  def test_platform_eh
    yaml = nil
    assert_deprecated('MIME::Type#platform?') do
      yaml = make_yaml_mime_type
      refute(yaml.platform?)
    end
    yaml.system = nil
    assert_deprecated('MIME::Type#platform?') do
      refute(yaml.platform?)
    end
    yaml.system = %r{#{RUBY_PLATFORM}}
    assert_deprecated('MIME::Type#platform?') do
      assert(yaml.platform?)
    end
  end

  def assert_priority(l, e, r)
    assert_equal(-1, l.first.priority_compare(l.last))
    assert_equal(0, e.first.priority_compare(e.last))
    assert_equal(1, r.first.priority_compare(r.last))
  end

  def test_priority_compare
    tl, te, tr = make('text/1'), make('text/1'), make('text/2')
    assert_priority([tl, tr], [tl, te], [tr, tl])

    tl.registered = te.registered = true
    tr = make(tl) { |t| t.registered = false }
    assert_priority([tl, tr], [tl, te], [tr, tl])

    tl.system = te.system = nil
    tr = make(tl) { |t| t.system = /#{RUBY_PLATFORM}/ }
    assert_priority([tl, tr], [tl, te], [tr, tl])

    tl.extensions = te.extensions = %w(1)
    tr = make(tl) { |t| t.extensions = nil }
    assert_priority([tl, tr], [tl, te], [tr, tl])

    tl.obsolete = te.obsolete = false
    tr = make(tl) { |t| t.obsolete = true }
    assert_priority([tl, tr], [tl, te], [tr, tl])

    tl.obsolete = te.obsolete = true
    tl.use_instead = te.use_instead = 'abc/xyz'
    tr = make(tl) { |t| t.use_instead = nil }
    assert_priority([tl, tr], [tl, te], [tr, tl])
    tr.use_instead = 'abc/zzz'
    assert_priority([tl, tr], [tl, te], [tr, tl])
  end

  def test_raw_media_type
    assert_equal('text', MIME::Type.new('text/plain').raw_media_type)
    assert_equal('image', MIME::Type.new('image/jpeg').raw_media_type)
    assert_equal('application', MIME::Type.new('application/x-msword').raw_media_type)
    assert_equal('text', MIME::Type.new('text/vCard').raw_media_type)
    assert_equal('application', MIME::Type.new('application/pkcs7-mime').raw_media_type)
    assert_equal('x-chemical', MIME::Type.new('x-chemical/x-pdb').raw_media_type)
    assert_equal('x-appl', @applzip.raw_media_type)
  end

  def test_raw_sub_type
    assert_equal('plain', MIME::Type.new('text/plain').raw_sub_type)
    assert_equal('jpeg', MIME::Type.new('image/jpeg').raw_sub_type)
    assert_equal('x-msword', MIME::Type.new('application/x-msword').raw_sub_type)
    assert_equal('vCard', MIME::Type.new('text/vCard').raw_sub_type)
    assert_equal('pkcs7-mime', MIME::Type.new('application/pkcs7-mime').raw_sub_type)
    assert_equal('x-zip', @applzip.raw_sub_type)
  end

  def test_registered_eh
    assert(MIME::Type.new('text/plain').registered?)
    assert(MIME::Type.new('image/jpeg').registered?)
    refute(MIME::Type.new('application/x-msword').registered?)
    assert(MIME::Type.new('text/vCard').registered?)
    assert(MIME::Type.new('application/pkcs7-mime').registered?)
    refute(@applzip.registered?)
    refute(MIME::Types['image/webp'].first.registered?)
    # Temporarily broken: requires the new data format to be enabled.
    assert(MIME::Types['application/x-www-form-urlencoded'].first.registered?)
  end

  def test_registered_equals
    [ nil, false, true ].each { |v|
      @applzip.registered = v
      assert_equal(v, @applzip.instance_variable_get(:@registered))
    }
    @applzip.registered = 1
    assert_equal(true, @applzip.instance_variable_get(:@registered))
  end

  def test_signature_eh
    refute(MIME::Type.new('text/plain').signature?)
    refute(MIME::Type.new('image/jpeg').signature?)
    refute(MIME::Type.new('application/x-msword').signature?)
  end

  def test_signature_equals
    sig = MIME::Type.new('text/vCard') { |t| t.signature = true }
    assert(sig.signature?)
  end

  def test_simplified
    assert_equal('text/plain', MIME::Type.new('text/plain').simplified)
    assert_equal('image/jpeg', MIME::Type.new('image/jpeg').simplified)
    assert_equal('application/msword', MIME::Type.new('application/x-msword').simplified)
    assert_equal('text/vcard', MIME::Type.new('text/vCard').simplified)
    assert_equal('application/pkcs7-mime', MIME::Type.new('application/pkcs7-mime').simplified)
    assert_equal('chemical/pdb', MIME::Type.new('x-chemical/x-pdb').simplified)
  end

  def test_sub_type
    assert_equal('plain', MIME::Type.new('text/plain').sub_type)
    assert_equal('jpeg', MIME::Type.new('image/jpeg').sub_type)
    assert_equal('msword', MIME::Type.new('application/x-msword').sub_type)
    assert_equal('vcard', MIME::Type.new('text/vCard').sub_type)
    assert_equal('pkcs7-mime', MIME::Type.new('application/pkcs7-mime').sub_type)
    assert_equal('zip', @applzip.sub_type)
  end

  def test_system
    assert_deprecated('MIME::Type#system') do
      yaml = make_yaml_mime_type
      assert_equal(%r{d9d172f608}, yaml.system)
    end
  end

  def test_system_equals
    yaml = make_yaml_mime_type
    yaml.system = /win32/
    assert_deprecated('MIME::Type#system') do
      assert_equal(%r{win32}, yaml.system)
    end
    yaml.system = nil
    assert_deprecated('MIME::Type#system') do
      assert_nil(yaml.system)
    end
  end

  def test_system_eh
    yaml = make_yaml_mime_type
    assert_deprecated('MIME::Type#system?') do
      assert(yaml.system?)
    end
    yaml.system = nil
    assert_deprecated('MIME::Type#system?') do
      refute(yaml.system?)
    end
  end

  def test_to_a
    yaml = make_yaml_mime_type
    assert_deprecated('MIME::Type#to_a') do
      assert_equal(['text/x-yaml', %w(yaml yml), '8bit', /d9d172f608/,
                    false, [], [], false], yaml.to_a)
    end
  end

  def test_to_hash
    yaml = make_yaml_mime_type
    assert_deprecated('MIME::Type#to_hash') do
      assert_equal(
        {
          'Content-Type'              => 'text/x-yaml',
          'Content-Transfer-Encoding' => '8bit',
          'Extensions'                => %w(yaml yml),
          'System'                    => /d9d172f608/,
          'Registered'                => false,
          'URL'                       => [],
          'Obsolete'                  => false,
          'Docs'                      => []
        },
        yaml.to_hash)
    end
  end

  def assert_type_has_keys(type, *keys)
    hash = type.to_h
    keys.flatten.each { |key| assert(hash.key?(key)) }
  end

  def test_to_h
    t = make('a/b')
    assert_type_has_keys(t, %w(content-type registered encoding))
    assert_type_has_keys(make(t) { |v| v.docs = 'Something' }, 'docs')
    assert_type_has_keys(make(t) { |v| v.extensions = %w(b) }, 'extensions')
    assert_type_has_keys(make(t) { |v| v.obsolete = true }, 'obsolete')
    assert_type_has_keys(make(t) { |v|
      v.obsolete = true
      v.use_instead = 'c/d'
    }, 'obsolete', 'use-instead')
    assert_type_has_keys(make(t) { |v|
      assert_deprecated('MIME::Type#references=') { v.references = 'IANA' }
    }, 'references')
    assert_type_has_keys(make(t) { |v| v.signature = true }, 'signature')
    assert_type_has_keys(make(t) { |v| v.system = /xyz/ }, 'system')
  end

  def test_to_json
    assert_equal('{"content-type":"a/b","encoding":"base64","registered":true}',
                 make('a/b').to_json)
  end

  def test_to_s
    assert_equal('text/plain', "#{MIME::Type.new('text/plain')}")
  end

  def test_class_constructors
    assert_instance_of(MIME::Type, MIME::Type.new('text/x-yaml'))
    assert_instance_of(MIME::Type, MIME::Type.new('text/x-yaml') { |y|
      assert_instance_of(MIME::Type, y)
    })
    assert_instance_of(MIME::Type, MIME::Type.new('content-type' => 'text/x-yaml'))
    assert_instance_of(MIME::Type, MIME::Type.new(['text/x-yaml', %w(yaml)]))
    assert_raises(MIME::Type::InvalidContentType) { MIME::Type.new('apps') }
    begin
      MIME::Type.new(nil)
    rescue MIME::Type::InvalidContentType => ex
      assert_equal('Invalid Content-Type nil', ex.message)
    end
  end

  def test_to_str
    assert_equal('stringy', 'text/plain'.sub(MIME::Type.new('text/plain'), 'stringy'))
  end

  def test_references
    assert_deprecated('MIME::Type#references') do
      assert_empty(make_yaml_mime_type.references)
    end
  end

  def test_references_equals
    yaml = make_yaml_mime_type
    assert_deprecated('MIME::Type#references=') do
      yaml.references = 'IANA'
    end
    assert_deprecated('MIME::Type#references') do
      assert_equal(%w(IANA), yaml.references)
    end

    assert_deprecated('MIME::Type#references=') do
      yaml.references = %w(IANA IANA)
    end
    assert_deprecated('MIME::Type#references') do
      assert_equal(%w(IANA), yaml.references)
    end
  end

  def test_xrefs
    assert_equal(
      {
        'rfc' => %w(rfc4239),
        'template' => %w(application/javascript)
      },
      make_javascript.xrefs
    )
  end

  def test_xref_urls
    js = make_javascript do |j|
      j.xrefs = j.xrefs.merge(
        'draft'      => [ 'RFC-ietf-appsawg-json-merge-patch-07' ],
        'person'     => [ 'David_Singer' ],
        'rfc-errata' => [ '3245' ],
        'uri'        => [ 'http://exmple.org' ],
        'text'       => [ 'text' ]
      )
    end
    assert_equal(
      [
        'http://www.iana.org/go/rfc4239',
        'http://www.iana.org/assignments/media-types/application/javascript',
        'http://www.iana.org/go/draft-ietf-appsawg-json-merge-patch-07',
        'http://www.iana.org/assignments/media-types/media-types.xhtml#David_Singer',
        'http://www.rfc-editor.org/errata_search.php?eid=3245',
        'http://exmple.org',
        'text'
      ],
      js.xref_urls
    )
  end

  def test_url
    assert_deprecated('MIME::Type#url') do
      assert_empty(make_yaml_mime_type.url)
    end
  end

  def test_url_equals
    yaml = make_yaml_mime_type
    assert_deprecated('MIME::Type#url=') do
      yaml.url = 'IANA'
    end
    assert_deprecated('MIME::Type#url') do
      assert_equal(%w(IANA), yaml.url)
    end
  end

  def test_urls
    yaml = make_yaml_mime_type
    assert_deprecated('MIME::Type#urls') do
      assert_empty(yaml.urls)
    end

    assert_deprecated('MIME::Type#references=') do
      yaml.references = %w(IANA RFC123 DRAFT:xyz [abc])
    end

    assert_deprecated('MIME::Type#urls') do
      assert_equal(
        %w(
          http://www.iana.org/assignments/media-types/text/yaml
          http://rfc-editor.org/rfc/rfc123.txt
          http://datatracker.ietf.org/public/idindex.cgi?command=id_details&filename=xyz
          http://www.iana.org/assignments/contact-people.htm#abc
        ),
        yaml.urls
      )
    end

    assert_deprecated('MIME::Type#references=') do
      yaml.references = '[def=lax]'
    end

    assert_deprecated('MIME::Type#urls') do
      assert_equal([%w(def http://www.iana.org/assignments/contact-people.htm#lax)],
                   yaml.urls)
    end

    assert_deprecated('MIME::Type#references=') do
      yaml.references = '{mno=pqr}'
    end

    assert_deprecated('MIME::Type#urls') do
      assert_equal([%w(mno pqr)], yaml.urls)
    end

    assert_deprecated('MIME::Type#references=') do
      yaml.references = 'hoge'
    end

    assert_deprecated('MIME::Type#urls') do
      assert_equal(%w(hoge), yaml.urls)
    end
  end

  def test_use_instead
    t = make('t/1') { |v| v.use_instead = 't/2' }
    assert_nil(t.use_instead)
    t.obsolete = true
    assert_equal('t/2', t.use_instead)
  end

  def test_use_instead_equals
    t = make('t/1') { |v| v.obsolete = true }
    assert_nil(t.use_instead)
    t.use_instead = 't/2'
    assert_equal('t/2', t.use_instead)
  end

  def test_preferred_extension
    assert_equal('zip', @applzip.preferred_extension)
  end

  def test_friendly_read
    yaml = make_yaml_mime_type
    assert_equal('YAML Structured Document', yaml.friendly)
    assert_equal('YAML Structured Document', yaml.friendly('en'))
    assert_equal(nil, yaml.friendly('fr'))
  end

  def test_friendly_set
    assert_equal({ 'en' => 'Zip' }, @applzip.friendly(%w(en Zip)))
    assert_equal({ 'en' => 'Zip Archive' }, @applzip.friendly('en' => 'Zip Archive'))
  end

  def test_i18n_key
    assert_equal('text.plain', make('text/plain').i18n_key)
    assert_equal('application.vnd-3gpp-bsf-xml',
                 make('application/vnd.3gpp.bsf+xml').i18n_key)
    assert_equal('application.msword', make('application/x-msword').i18n_key)
  end

  def test_deprecated_constant
    assert_output(nil, /MIME::InvalidContentType/) do
      assert_same(MIME::InvalidContentType, MIME::Type::InvalidContentType)
    end
    assert_output(nil, /MIME::InvalidContentType/) do
      assert_same(MIME::InvalidContentType, MIME::Type::InvalidContentType)
    end
    assert_raises(NameError) { MIME::Foo }
  end
end

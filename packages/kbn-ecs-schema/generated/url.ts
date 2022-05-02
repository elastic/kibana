export const urlEcs = {
  domain: {
    dashed_name: 'url-domain',
    description: 'Domain of the url, such as "www.elastic.co".\n' +
      'In some cases a URL may refer to an IP and/or port directly, without a domain name. In this case, the IP address would go to the `domain` field.\n' +
      'If the URL contains a literal IPv6 address enclosed by `[` and `]` (IETF RFC 2732), the `[` and `]` characters should also be captured in the `domain` field.',
    example: 'www.elastic.co',
    flat_name: 'url.domain',
    ignore_above: 1024,
    level: 'extended',
    name: 'domain',
    normalize: [],
    short: 'Domain of the url.',
    type: 'keyword'
  },
  extension: {
    dashed_name: 'url-extension',
    description: 'The field contains the file extension from the original request url, excluding the leading dot.\n' +
      'The file extension is only set if it exists, as not every url has a file extension.\n' +
      'The leading period must not be included. For example, the value must be "png", not ".png".\n' +
      'Note that when the file name has multiple extensions (example.tar.gz), only the last one should be captured ("gz", not "tar.gz").',
    example: 'png',
    flat_name: 'url.extension',
    ignore_above: 1024,
    level: 'extended',
    name: 'extension',
    normalize: [],
    short: 'File extension from the request url, excluding the leading dot.',
    type: 'keyword'
  },
  fragment: {
    dashed_name: 'url-fragment',
    description: 'Portion of the url after the `#`, such as "top".\n' +
      'The `#` is not part of the fragment.',
    flat_name: 'url.fragment',
    ignore_above: 1024,
    level: 'extended',
    name: 'fragment',
    normalize: [],
    short: 'Portion of the url after the `#`.',
    type: 'keyword'
  },
  full: {
    dashed_name: 'url-full',
    description: 'If full URLs are important to your use case, they should be stored in `url.full`, whether this field is reconstructed or present in the event source.',
    example: 'https://www.elastic.co:443/search?q=elasticsearch#top',
    flat_name: 'url.full',
    level: 'extended',
    multi_fields: [ [Object] ],
    name: 'full',
    normalize: [],
    short: 'Full unparsed URL.',
    type: 'wildcard'
  },
  original: {
    dashed_name: 'url-original',
    description: 'Unmodified original url as seen in the event source.\n' +
      'Note that in network monitoring, the observed URL may be a full URL, whereas in access logs, the URL is often just represented as a path.\n' +
      'This field is meant to represent the URL as it was observed, complete or not.',
    example: 'https://www.elastic.co:443/search?q=elasticsearch#top or /search?q=elasticsearch',
    flat_name: 'url.original',
    level: 'extended',
    multi_fields: [ [Object] ],
    name: 'original',
    normalize: [],
    short: 'Unmodified original url as seen in the event source.',
    type: 'wildcard'
  },
  password: {
    dashed_name: 'url-password',
    description: 'Password of the request.',
    flat_name: 'url.password',
    ignore_above: 1024,
    level: 'extended',
    name: 'password',
    normalize: [],
    short: 'Password of the request.',
    type: 'keyword'
  },
  path: {
    dashed_name: 'url-path',
    description: 'Path of the request, such as "/search".',
    flat_name: 'url.path',
    level: 'extended',
    name: 'path',
    normalize: [],
    short: 'Path of the request, such as "/search".',
    type: 'wildcard'
  },
  port: {
    dashed_name: 'url-port',
    description: 'Port of the request, such as 443.',
    example: 443,
    flat_name: 'url.port',
    format: 'string',
    level: 'extended',
    name: 'port',
    normalize: [],
    short: 'Port of the request, such as 443.',
    type: 'long'
  },
  query: {
    dashed_name: 'url-query',
    description: 'The query field describes the query string of the request, such as "q=elasticsearch".\n' +
      'The `?` is excluded from the query string. If a URL contains no `?`, there is no query field. If there is a `?` but no query, the query field exists with an empty string. The `exists` query can be used to differentiate between the two cases.',
    flat_name: 'url.query',
    ignore_above: 1024,
    level: 'extended',
    name: 'query',
    normalize: [],
    short: 'Query string of the request.',
    type: 'keyword'
  },
  registered_domain: {
    dashed_name: 'url-registered-domain',
    description: 'The highest registered url domain, stripped of the subdomain.\n' +
      'For example, the registered domain for "foo.example.com" is "example.com".\n' +
      'This value can be determined precisely with a list like the public suffix list (http://publicsuffix.org). Trying to approximate this by simply taking the last two labels will not work well for TLDs such as "co.uk".',
    example: 'example.com',
    flat_name: 'url.registered_domain',
    ignore_above: 1024,
    level: 'extended',
    name: 'registered_domain',
    normalize: [],
    short: 'The highest registered url domain, stripped of the subdomain.',
    type: 'keyword'
  },
  scheme: {
    dashed_name: 'url-scheme',
    description: 'Scheme of the request, such as "https".\n' +
      'Note: The `:` is not part of the scheme.',
    example: 'https',
    flat_name: 'url.scheme',
    ignore_above: 1024,
    level: 'extended',
    name: 'scheme',
    normalize: [],
    short: 'Scheme of the url.',
    type: 'keyword'
  },
  subdomain: {
    dashed_name: 'url-subdomain',
    description: 'The subdomain portion of a fully qualified domain name includes all of the names except the host name under the registered_domain.  In a partially qualified domain, or if the the qualification level of the full name cannot be determined, subdomain contains all of the names below the registered domain.\n' +
      'For example the subdomain portion of "www.east.mydomain.co.uk" is "east". If the domain has multiple levels of subdomain, such as "sub2.sub1.example.com", the subdomain field should contain "sub2.sub1", with no trailing period.',
    example: 'east',
    flat_name: 'url.subdomain',
    ignore_above: 1024,
    level: 'extended',
    name: 'subdomain',
    normalize: [],
    short: 'The subdomain of the domain.',
    type: 'keyword'
  },
  top_level_domain: {
    dashed_name: 'url-top-level-domain',
    description: 'The effective top level domain (eTLD), also known as the domain suffix, is the last part of the domain name. For example, the top level domain for example.com is "com".\n' +
      'This value can be determined precisely with a list like the public suffix list (http://publicsuffix.org). Trying to approximate this by simply taking the last label will not work well for effective TLDs such as "co.uk".',
    example: 'co.uk',
    flat_name: 'url.top_level_domain',
    ignore_above: 1024,
    level: 'extended',
    name: 'top_level_domain',
    normalize: [],
    short: 'The effective top level domain (com, org, net, co.uk).',
    type: 'keyword'
  },
  username: {
    dashed_name: 'url-username',
    description: 'Username of the request.',
    flat_name: 'url.username',
    ignore_above: 1024,
    level: 'extended',
    name: 'username',
    normalize: [],
    short: 'Username of the request.',
    type: 'keyword'
  }
}
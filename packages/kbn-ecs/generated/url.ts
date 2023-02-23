/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

/**
 * URL fields provide support for complete or partial URLs, and supports the breaking down into scheme, domain, path, and so on.
 */
export interface EcsUrl {
  /**
   * Domain of the url, such as "www.elastic.co".
   * In some cases a URL may refer to an IP and/or port directly, without a domain name. In this case, the IP address would go to the `domain` field.
   * If the URL contains a literal IPv6 address enclosed by `[` and `]` (IETF RFC 2732), the `[` and `]` characters should also be captured in the `domain` field.
   */
  domain?: string;
  /**
   * The field contains the file extension from the original request url, excluding the leading dot.
   * The file extension is only set if it exists, as not every url has a file extension.
   * The leading period must not be included. For example, the value must be "png", not ".png".
   * Note that when the file name has multiple extensions (example.tar.gz), only the last one should be captured ("gz", not "tar.gz").
   */
  extension?: string;
  /**
   * Portion of the url after the `#`, such as "top".
   * The `#` is not part of the fragment.
   */
  fragment?: string;
  /**
   * If full URLs are important to your use case, they should be stored in `url.full`, whether this field is reconstructed or present in the event source.
   */
  full?: string;
  /**
   * Unmodified original url as seen in the event source.
   * Note that in network monitoring, the observed URL may be a full URL, whereas in access logs, the URL is often just represented as a path.
   * This field is meant to represent the URL as it was observed, complete or not.
   */
  original?: string;
  /**
   * Password of the request.
   */
  password?: string;
  /**
   * Path of the request, such as "/search".
   */
  path?: string;
  /**
   * Port of the request, such as 443.
   */
  port?: number;
  /**
   * The query field describes the query string of the request, such as "q=elasticsearch".
   * The `?` is excluded from the query string. If a URL contains no `?`, there is no query field. If there is a `?` but no query, the query field exists with an empty string. The `exists` query can be used to differentiate between the two cases.
   */
  query?: string;
  /**
   * The highest registered url domain, stripped of the subdomain.
   * For example, the registered domain for "foo.example.com" is "example.com".
   * This value can be determined precisely with a list like the public suffix list (http://publicsuffix.org). Trying to approximate this by simply taking the last two labels will not work well for TLDs such as "co.uk".
   */
  registered_domain?: string;
  /**
   * Scheme of the request, such as "https".
   * Note: The `:` is not part of the scheme.
   */
  scheme?: string;
  /**
   * The subdomain portion of a fully qualified domain name includes all of the names except the host name under the registered_domain.  In a partially qualified domain, or if the the qualification level of the full name cannot be determined, subdomain contains all of the names below the registered domain.
   * For example the subdomain portion of "www.east.mydomain.co.uk" is "east". If the domain has multiple levels of subdomain, such as "sub2.sub1.example.com", the subdomain field should contain "sub2.sub1", with no trailing period.
   */
  subdomain?: string;
  /**
   * The effective top level domain (eTLD), also known as the domain suffix, is the last part of the domain name. For example, the top level domain for example.com is "com".
   * This value can be determined precisely with a list like the public suffix list (http://publicsuffix.org). Trying to approximate this by simply taking the last label will not work well for effective TLDs such as "co.uk".
   */
  top_level_domain?: string;
  /**
   * Username of the request.
   */
  username?: string;
}

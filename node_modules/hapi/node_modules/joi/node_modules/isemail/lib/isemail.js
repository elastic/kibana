/**
 * To validate an email address according to RFCs 5321, 5322 and others
 *
 * Copyright © 2008-2011, Dominic Sayers
 * Test schema documentation Copyright © 2011, Daniel Marschall
 * Port for Node.js Copyright © 2013, GlobeSherpa
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are met:
 *
 *   - Redistributions of source code must retain the above copyright notice,
 *     this list of conditions and the following disclaimer.
 *   - Redistributions in binary form must reproduce the above copyright notice,
 *     this list of conditions and the following disclaimer in the documentation
 *     and/or other materials provided with the distribution.
 *   - Neither the name of Dominic Sayers nor the names of its contributors may
 *     be used to endorse or promote products derived from this software without
 *     specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
 * AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
 * IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE
 * ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE
 * LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR
 * CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF
 * SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS
 * INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN
 * CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE)
 * ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE
 * POSSIBILITY OF SUCH DAMAGE.
 *
 * @author      Dominic Sayers <dominic@sayers.cc>
 * @author      Eli Skeggs <eskeggs@globesherpa.com>
 * @copyright   2008-2011 Dominic Sayers
 * @copyright   2013-2014 GlobeSherpa
 * @license     http://www.opensource.org/licenses/bsd-license.php BSD License
 * @link        http://www.dominicsayers.com/isemail
 * @link        https://github.com/globesherpa/isemail
 * @version     1.1.1 - Optimization pass, simplify constants, style, dead code.
 */

// lazy-loaded
var dns, HAS_REQUIRE = typeof require !== 'undefined';

// categories
var ISEMAIL_VALID_CATEGORY = 1;
var ISEMAIL_DNSWARN = 7;
var ISEMAIL_RFC5321 = 15;
var ISEMAIL_CFWS = 31;
var ISEMAIL_DEPREC = 63;
var ISEMAIL_RFC5322 = 127;
var ISEMAIL_ERR = 255;

// diagnoses
// address is valid
var ISEMAIL_VALID = 0;
// address is valid but a DNS check was not successful
var ISEMAIL_DNSWARN_NO_MX_RECORD = 5;
var ISEMAIL_DNSWARN_NO_RECORD = 6;
// address is valid for SMTP but has unusual elements
var ISEMAIL_RFC5321_TLD = 9;
var ISEMAIL_RFC5321_TLDNUMERIC = 10;
var ISEMAIL_RFC5321_QUOTEDSTRING = 11;
var ISEMAIL_RFC5321_ADDRESSLITERAL = 12;
var ISEMAIL_RFC5321_IPV6DEPRECATED = 13;
// address is valid within the message but cannot be used unmodified for the
// envelope
var ISEMAIL_CFWS_COMMENT = 17;
var ISEMAIL_CFWS_FWS = 18;
// address contains deprecated elements but may still be valid in restricted
// contexts
var ISEMAIL_DEPREC_LOCALPART = 33;
var ISEMAIL_DEPREC_FWS = 34;
var ISEMAIL_DEPREC_QTEXT = 35;
var ISEMAIL_DEPREC_QP = 36;
var ISEMAIL_DEPREC_COMMENT = 37;
var ISEMAIL_DEPREC_CTEXT = 38;
var ISEMAIL_DEPREC_CFWS_NEAR_AT = 49;
// the address is only valid according to the broad definition of RFC 5322, but
// otherwise invalid
var ISEMAIL_RFC5322_DOMAIN = 65;
var ISEMAIL_RFC5322_TOOLONG = 66;
var ISEMAIL_RFC5322_LOCAL_TOOLONG = 67;
var ISEMAIL_RFC5322_DOMAIN_TOOLONG = 68;
var ISEMAIL_RFC5322_LABEL_TOOLONG = 69;
var ISEMAIL_RFC5322_DOMAINLITERAL = 70;
var ISEMAIL_RFC5322_DOMLIT_OBSDTEXT = 71;
var ISEMAIL_RFC5322_IPV6_GRPCOUNT = 72;
var ISEMAIL_RFC5322_IPV6_2X2XCOLON = 73;
var ISEMAIL_RFC5322_IPV6_BADCHAR = 74;
var ISEMAIL_RFC5322_IPV6_MAXGRPS = 75;
var ISEMAIL_RFC5322_IPV6_COLONSTRT = 76;
var ISEMAIL_RFC5322_IPV6_COLONEND = 77;
// address is invalid for any purpose
var ISEMAIL_ERR_EXPECTING_DTEXT = 129;
var ISEMAIL_ERR_NOLOCALPART = 130;
var ISEMAIL_ERR_NODOMAIN = 131;
var ISEMAIL_ERR_CONSECUTIVEDOTS = 132;
var ISEMAIL_ERR_ATEXT_AFTER_CFWS = 133;
var ISEMAIL_ERR_ATEXT_AFTER_QS = 134;
var ISEMAIL_ERR_ATEXT_AFTER_DOMLIT = 135;
var ISEMAIL_ERR_EXPECTING_QPAIR = 136;
var ISEMAIL_ERR_EXPECTING_ATEXT = 137;
var ISEMAIL_ERR_EXPECTING_QTEXT = 138;
var ISEMAIL_ERR_EXPECTING_CTEXT = 139;
var ISEMAIL_ERR_BACKSLASHEND = 140;
var ISEMAIL_ERR_DOT_START = 141;
var ISEMAIL_ERR_DOT_END = 142;
var ISEMAIL_ERR_DOMAINHYPHENSTART = 143;
var ISEMAIL_ERR_DOMAINHYPHENEND = 144;
var ISEMAIL_ERR_UNCLOSEDQUOTEDSTR = 145;
var ISEMAIL_ERR_UNCLOSEDCOMMENT = 146;
var ISEMAIL_ERR_UNCLOSEDDOMLIT = 147;
var ISEMAIL_ERR_FWS_CRLF_X2 = 148;
var ISEMAIL_ERR_FWS_CRLF_END = 149;
var ISEMAIL_ERR_CR_NO_LF = 150;
var ISEMAIL_ERR_UNKNOWN_TLD = 160;
var ISEMAIL_ERR_TOOSHORT_DOMAIN = 161;

// function control
var THRESHOLD = 16;
// email parts
var COMPONENT_LOCALPART = 0;
var COMPONENT_DOMAIN = 1;
var COMPONENT_LITERAL = 2;
var CONTEXT_COMMENT = 3;
var CONTEXT_FWS = 4;
var CONTEXT_QUOTEDSTRING = 5;
var CONTEXT_QUOTEDPAIR = 6;

// US-ASCII visible characters not valid for atext
// (http://tools.ietf.org/html/rfc5322#section-3.2.3)
var SPECIALS = '()<>[]:;@\\,."';

function optimizeLookup(string) {
  var body = '', min = 0x100, max = 0, lookup = new Array(min);
  for (var i = min - 1; i >= 0; i--) {
    lookup[i] = false;
  }
  for (var i = 0; i < string.length; i++) {
    var chr = string.charCodeAt(i);
    if (chr < min) {
      min = chr;
    }
    if (chr > max) {
      max = chr;
    }
    lookup[chr] = true;
  }
  lookup.length = max;
  var body = 'var lookup = ' + JSON.stringify(lookup) + ';\n';
  body += 'return function(code) {\n';
  body += '  if (code < ' + min + ' || code > ' + max + ') {\n';
  body += '    return false;\n';
  body += '  }\n';
  body += '  return lookup[code];\n';
  body += '}';
  return (new Function(body))();
}

var specialsLookup = optimizeLookup(SPECIALS);

// matches valid IPv4 addresses from the end of a string
var IPv4_REGEX =
  /\b(?:(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d\d?)$/;
var IPv6_REGEX = /^[a-fA-F\d]{0,4}$/;
var IPv6_REGEX_TEST = IPv6_REGEX.test.bind(IPv6_REGEX);

var hasOwn = Object.prototype.hasOwnProperty;

/**
 * Get the largest number in the array.
 *
 * Returns -Infinity if the array is empty.
 *
 * @param {Array.<number>} array The array to scan.
 * @return {number} The largest number contained.
 */
function maxValue(array) {
  var v = -Infinity, i = 0, n = array.length;

  for (; i < n; i++) {
    if (array[i] > v) {
      v = array[i];
    }
  }

  return v;
}

/**
 * Check that an email address conforms to RFCs 5321, 5322 and others
 *
 * As of Version 3.0, we are now distinguishing clearly between a Mailbox
 * as defined by RFC 5321 and an addr-spec as defined by RFC 5322. Depending
 * on the context, either can be regarded as a valid email address. The
 * RFC 5321 Mailbox specification is more restrictive (comments, white space
 * and obsolete forms are not allowed).
 *
 * @param {string} email The email address to check.
 * @param {boolean} checkDNS If true then will check DNS for MX records. If true
 *   this isEmail _will_ be asynchronous.
 * @param {*} errorLevel Determines the boundary between valid and invalid
 *   addresses. Status codes above this number will be returned as-is, status
 *   codes below will be returned as ISEMAIL_VALID. Thus the calling program can
 *   simply look for ISEMAIL_VALID if it is only interested in whether an
 *   address is valid or not. The errorLevel will determine how "picky"
 *   isEmail() is about the address. If omitted or passed as false then
 *   isEmail() will return true or false rather than an integer error or
 *   warning. NB Note the difference between errorLevel = false and
 *   errorLevel = 0.
 * @return {*}
 */
function isEmail(email, options, callback) {
  if (typeof options === 'function') {
    callback = options;
    options = {};
  }
  options || (options = {});

  var threshold, diagnose;
  if (typeof options.errorLevel === 'number') {
    diagnose = true;
    threshold = options.errorLevel;
  } else {
    diagnose = !!options.errorLevel;
    threshold = ISEMAIL_VALID;
  }

  if (options.tldWhitelist && typeof options.tldWhitelist !== 'object') {
    throw new TypeError('expected array or object tldWhitelist');
  }

  if (options.minDomainAtoms && (options.minDomainAtoms !==
      ((+options.minDomainAtoms) | 0) || options.minDomainAtoms < 0)) {
    throw new TypeError('expected positive integer minDomainAtoms');
  }

  var maxResult = ISEMAIL_VALID;

  function updateResult(value) {
    if (value > maxResult) {
      maxResult = value;
    }
  }

  var context = {
    now: COMPONENT_LOCALPART,
    prev: COMPONENT_LOCALPART,
    stack: [COMPONENT_LOCALPART]
  };

  var token = '', prevToken = '', charCode = 0;
  var parseData = {local: '', domain: ''};
  var atomList = {local: [''], domain: ['']};

  var elementCount = 0, elementLength = 0, crlfCount = 0;
  var hyphenFlag = false, assertEnd = false;

  for (var i = 0; i < email.length; i++) {
    token = email[i];

    switch (context.now) {
    // local-part
    case COMPONENT_LOCALPART:
      // http://tools.ietf.org/html/rfc5322#section-3.4.1
      //   local-part      =   dot-atom / quoted-string / obs-local-part
      //
      //   dot-atom        =   [CFWS] dot-atom-text [CFWS]
      //
      //   dot-atom-text   =   1*atext *("." 1*atext)
      //
      //   quoted-string   =   [CFWS]
      //                       DQUOTE *([FWS] qcontent) [FWS] DQUOTE
      //                       [CFWS]
      //
      //   obs-local-part  =   word *("." word)
      //
      //   word            =   atom / quoted-string
      //
      //   atom            =   [CFWS] 1*atext [CFWS]
      switch (token) {
      // comment
      case '(':
        if (elementLength === 0) {
          // comments are OK at the beginning of an element
          updateResult(elementCount === 0 ? ISEMAIL_CFWS_COMMENT :
            ISEMAIL_DEPREC_COMMENT);
        } else {
          updateResult(ISEMAIL_CFWS_COMMENT);
           // can't start a comment in an element, should be end
          assertEnd = true;
        }
        context.stack.push(context.now);
        context.now = CONTEXT_COMMENT;
        break;
      // next dot-atom element
      case '.':
        if (elementLength === 0) {
          // another dot, already?
          updateResult(elementCount === 0 ? ISEMAIL_ERR_DOT_START :
            ISEMAIL_ERR_CONSECUTIVEDOTS);
        } else {
          // the entire local-part can be a quoted string for RFC 5321
          // if it's just one atom that is quoted then it's an RFC 5322 obsolete
          // form
          if (assertEnd) {
            updateResult(ISEMAIL_DEPREC_LOCALPART);
          }

          // CFWS & quoted strings are OK again now we're at the beginning of an
          // element (although they are obsolete forms)
          assertEnd = false;
          elementLength = 0;
          elementCount++;
          parseData.local += token;
          atomList.local[elementCount] = ''; // TODO: push?
        }
        break;
      // quoted string
      case '"':
        if (elementLength === 0) {
          // the entire local-part can be a quoted string for RFC 5321
          // if it's just one atom that is quoted then it's an RFC 5322 obsolete
          // form
          updateResult(elementCount === 0 ? ISEMAIL_RFC5321_QUOTEDSTRING :
            ISEMAIL_DEPREC_LOCALPART);

          parseData.local += token;
          atomList.local[elementCount] += token;
          elementLength++;
          assertEnd = true; // quoted string must be the entire element
          context.stack.push(context.now);
          context.now = CONTEXT_QUOTEDSTRING;
        } else {
          updateResult(ISEMAIL_ERR_EXPECTING_ATEXT);
        }
        break;
      // folding white space
      case '\r':
        if ((++i === email.length) || email[i] !== '\n') {
          // fatal error
          updateResult(ISEMAIL_ERR_CR_NO_LF);
          break;
        }
      case ' ':
      case '\t':
        if (elementLength === 0) {
          updateResult(elementCount === 0 ? ISEMAIL_CFWS_FWS :
            ISEMAIL_DEPREC_FWS);
        } else {
          // we can't start FWS in the middle of an element, better be end
          assertEnd = true;
        }

        context.stack.push(context.now);
        context.now = CONTEXT_FWS;
        prevToken = token;
        break;
      // @
      case '@':
        // at this point we should have a valid local-part
        /* istanbul ignore next: logically unreachable */
        if (context.stack.length !== 1) {
          throw new Error('unexpected item on context stack');
        }

        if (parseData.local.length === 0) {
          // fatal error
          updateResult(ISEMAIL_ERR_NOLOCALPART);
        } else if (elementLength === 0) {
          // fatal error
          updateResult(ISEMAIL_ERR_DOT_END);
        // http://tools.ietf.org/html/rfc5321#section-4.5.3.1.1
        //   the maximum total length of a user name or other local-part is 64
        //   octets
        } else if (parseData.local.length > 64) {
          updateResult(ISEMAIL_RFC5322_LOCAL_TOOLONG);
        // http://tools.ietf.org/html/rfc5322#section-3.4.1
        //   comments and folding white space
        //   SHOULD NOT be used around the "@" in the addr-spec
        //
        // http://tools.ietf.org/html/rfc2119
        // 4. SHOULD NOT  this phrase, or the phrase "NOT RECOMMENDED" mean that
        //    there may exist valid reasons in particular circumstances when the
        //    particular behavior is acceptable or even useful, but the full
        //    implications should be understood and the case carefully weighed
        //    before implementing any behavior described with this label
        } else if ((context.prev === CONTEXT_COMMENT) ||
            (context.prev === CONTEXT_FWS)) {
          updateResult(ISEMAIL_DEPREC_CFWS_NEAR_AT);
        }

        // clear everything down for the domain parsing
        context.now = COMPONENT_DOMAIN; // where we are
        context.stack[0] = COMPONENT_DOMAIN; // where we have been
        elementCount = 0;
        elementLength = 0;
        assertEnd = false; // CFWS can only appear at the end of the element
        break;
      // atext
      default:
        // http://tools.ietf.org/html/rfc5322#section-3.2.3
        //    atext = ALPHA / DIGIT / ; Printable US-ASCII
        //            "!" / "#" /     ;  characters not including
        //            "$" / "%" /     ;  specials.  Used for atoms.
        //            "&" / "'" /
        //            "*" / "+" /
        //            "-" / "/" /
        //            "=" / "?" /
        //            "^" / "_" /
        //            "`" / "{" /
        //            "|" / "}" /
        //            "~"
        if (assertEnd) {
          // we have encountered atext where it is no longer valid
          switch (context.prev) {
          case CONTEXT_COMMENT:
          case CONTEXT_FWS:
            updateResult(ISEMAIL_ERR_ATEXT_AFTER_CFWS);
            break;
          case CONTEXT_QUOTEDSTRING:
            updateResult(ISEMAIL_ERR_ATEXT_AFTER_QS);
            break;
          /* istanbul ignore next: logically unreachable */
          default:
            throw new Error('more atext found where none is allowed, ' +
              'but unrecognized prev context: ' + context.prev);
          }
        } else {
          context.prev = context.now;
          charCode = token.charCodeAt(0);

          if (charCode < 33 || charCode > 126 || charCode === 10 ||
              specialsLookup(charCode)) {
            // fatal error
            updateResult(ISEMAIL_ERR_EXPECTING_ATEXT);
          }

          parseData.local += token;
          atomList.local[elementCount] += token;
          elementLength++;
        }
      }
      break;
    case COMPONENT_DOMAIN:
      // http://tools.ietf.org/html/rfc5322#section-3.4.1
      //   domain          =   dot-atom / domain-literal / obs-domain
      //
      //   dot-atom        =   [CFWS] dot-atom-text [CFWS]
      //
      //   dot-atom-text   =   1*atext *("." 1*atext)
      //
      //   domain-literal  =   [CFWS] "[" *([FWS] dtext) [FWS] "]" [CFWS]
      //
      //   dtext           =   %d33-90 /          ; Printable US-ASCII
      //                       %d94-126 /         ;  characters not including
      //                       obs-dtext          ;  "[", "]", or "\"
      //
      //   obs-domain      =   atom *("." atom)
      //
      //   atom            =   [CFWS] 1*atext [CFWS]

      // http://tools.ietf.org/html/rfc5321#section-4.1.2
      //   Mailbox        = Local-part "@" ( Domain / address-literal )
      //
      //   Domain         = sub-domain *("." sub-domain)
      //
      //   address-literal  = "[" ( IPv4-address-literal /
      //                    IPv6-address-literal /
      //                    General-address-literal ) "]"
      //                    ; See Section 4.1.3

      // http://tools.ietf.org/html/rfc5322#section-3.4.1
      //      Note: A liberal syntax for the domain portion of addr-spec is
      //      given here.  However, the domain portion contains addressing
      //      information specified by and used in other protocols (e.g.,
      //      [RFC1034], [RFC1035], [RFC1123], [RFC5321]).  It is therefore
      //      incumbent upon implementations to conform to the syntax of
      //      addresses for the context in which they are used.
      // is_email() author's note: it's not clear how to interpret this in
      // the context of a general email address validator. The conclusion I
      // have reached is this: "addressing information" must comply with
      // RFC 5321 (and in turn RFC 1035), anything that is "semantically
      // invisible" must comply only with RFC 5322.
      switch (token) {
      // comment
      case '(':
        if (elementLength === 0) {
          // comments at the start of the domain are deprecated in the text
          // comments at the start of a subdomain are obs-domain
          // (http://tools.ietf.org/html/rfc5322#section-3.4.1)
          updateResult(elementCount === 0 ? ISEMAIL_DEPREC_CFWS_NEAR_AT :
            ISEMAIL_DEPREC_COMMENT);
        } else {
          updateResult(ISEMAIL_CFWS_COMMENT);
          assertEnd = true; // can't start a comment mid-element, better be end
        }

        context.stack.push(context.now);
        context.now = CONTEXT_COMMENT;
        break;
      // next dot-atom element
      case '.':
        if (elementLength === 0) {
          // another dot, already? fatal error
          updateResult(elementCount === 0 ? ISEMAIL_ERR_DOT_START :
            ISEMAIL_ERR_CONSECUTIVEDOTS);
        } else if (hyphenFlag) {
          // previous subdomain ended in a hyphen
          updateResult(ISEMAIL_ERR_DOMAINHYPHENEND); // fatal error
        } else if (elementLength > 63) {
          // Nowhere in RFC 5321 does it say explicitly that the
          // domain part of a Mailbox must be a valid domain according
          // to the DNS standards set out in RFC 1035, but this *is*
          // implied in several places. For instance, wherever the idea
          // of host routing is discussed the RFC says that the domain
          // must be looked up in the DNS. This would be nonsense unless
          // the domain was designed to be a valid DNS domain. Hence we
          // must conclude that the RFC 1035 restriction on label length
          // also applies to RFC 5321 domains.
          //
          // http://tools.ietf.org/html/rfc1035#section-2.3.4
          // labels          63 octets or less

          updateResult(ISEMAIL_RFC5322_LABEL_TOOLONG);
        }

        // CFWS is OK again now we're at the beginning of an element (although
        // it may be obsolete CFWS)
        assertEnd = false;
        elementLength = 0;
        elementCount++;
        atomList.domain[elementCount] = '';
        parseData.domain += token;

        break;
      // domain literal
      case '[':
        if (parseData.domain.length === 0) {
          // domain literal must be the only component
          assertEnd = true;
          elementLength++;
          context.stack.push(context.now);
          context.now = COMPONENT_LITERAL;
          parseData.domain += token;
          atomList.domain[elementCount] += token;
          parseData.literal = '';
        } else {
          // fatal error
          updateResult(ISEMAIL_ERR_EXPECTING_ATEXT);
        }
        break;
      // folding white space
      case '\r':
        if ((++i === email.length) || email[i] !== '\n') {
          // fatal error
          updateResult(ISEMAIL_ERR_CR_NO_LF);
          break;
        }
      case ' ':
      case '\t':
        if (elementLength === 0) {
          updateResult(elementCount === 0 ? ISEMAIL_DEPREC_CFWS_NEAR_AT :
            ISEMAIL_DEPREC_FWS);
        } else {
          // we can't start FWS in the middle of an element, so this better be
          // the end
          updateResult(ISEMAIL_CFWS_FWS);
          assertEnd = true;
        }

        context.stack.push(context.now);
        context.now = CONTEXT_FWS;
        prevToken = token;
        break;
      // atext
      default:
        // RFC 5322 allows any atext...
        // http://tools.ietf.org/html/rfc5322#section-3.2.3
        //    atext = ALPHA / DIGIT / ; Printable US-ASCII
        //            "!" / "#" /     ;  characters not including
        //            "$" / "%" /     ;  specials.  Used for atoms.
        //            "&" / "'" /
        //            "*" / "+" /
        //            "-" / "/" /
        //            "=" / "?" /
        //            "^" / "_" /
        //            "`" / "{" /
        //            "|" / "}" /
        //            "~"

        // But RFC 5321 only allows letter-digit-hyphen to comply with DNS rules
        //   (RFCs 1034 & 1123)
        // http://tools.ietf.org/html/rfc5321#section-4.1.2
        //   sub-domain     = Let-dig [Ldh-str]
        //
        //   Let-dig        = ALPHA / DIGIT
        //
        //   Ldh-str        = *( ALPHA / DIGIT / "-" ) Let-dig
        //
        if (assertEnd) {
          // we have encountered atext where it is no longer valid
          switch (context.prev) {
          case CONTEXT_COMMENT:
          case CONTEXT_FWS:
            updateResult(ISEMAIL_ERR_ATEXT_AFTER_CFWS);
            break;
          case COMPONENT_LITERAL:
            updateResult(ISEMAIL_ERR_ATEXT_AFTER_DOMLIT);
            break;
          /* istanbul ignore next: logically unreachable */
          default:
            throw new Error('more atext found where none is allowed, ' +
              'but unrecognized prev context: ' + context.prev);
          }
        }

        charCode = token.charCodeAt(0);
        // assume this token isn't a hyphen unless we discover it is
        hyphenFlag = false;

        if (charCode < 33 || charCode > 126 || specialsLookup(charCode)) {
          // fatal error
          updateResult(ISEMAIL_ERR_EXPECTING_ATEXT);
        } else if (token === '-') {
          if (elementLength === 0) {
            // hyphens can't be at the beginning of a subdomain
            updateResult(ISEMAIL_ERR_DOMAINHYPHENSTART); // fatal error
          }

          hyphenFlag = true;
        } else if (!((charCode > 47 && charCode < 58) ||
                     (charCode > 64 && charCode < 91) ||
                     (charCode > 96 && charCode < 123))) {
          // not an RFC 5321 subdomain, but still OK by RFC 5322
          updateResult(ISEMAIL_RFC5322_DOMAIN);
        }

        parseData.domain += token;
        atomList.domain[elementCount] += token;
        elementLength++;
      }
      break;
    // domain literal
    case COMPONENT_LITERAL:
      // http://tools.ietf.org/html/rfc5322#section-3.4.1
      //   domain-literal  =   [CFWS] "[" *([FWS] dtext) [FWS] "]" [CFWS]
      //
      //   dtext           =   %d33-90 /          ; Printable US-ASCII
      //                       %d94-126 /         ;  characters not including
      //                       obs-dtext          ;  "[", "]", or "\"
      //
      //   obs-dtext       =   obs-NO-WS-CTL / quoted-pair
      switch (token) {
      // end of domain literal
      case ']':
        if (maxResult < ISEMAIL_DEPREC) {
          // Could be a valid RFC 5321 address literal, so let's check

          // http://tools.ietf.org/html/rfc5321#section-4.1.2
          //   address-literal  = "[" ( IPv4-address-literal /
          //                    IPv6-address-literal /
          //                    General-address-literal ) "]"
          //                    ; See Section 4.1.3
          //
          // http://tools.ietf.org/html/rfc5321#section-4.1.3
          //   IPv4-address-literal  = Snum 3("."  Snum)
          //
          //   IPv6-address-literal  = "IPv6:" IPv6-addr
          //
          //   General-address-literal  = Standardized-tag ":" 1*dcontent
          //
          //   Standardized-tag  = Ldh-str
          //                     ; Standardized-tag MUST be specified in a
          //                     ; Standards-Track RFC and registered with IANA
          //
          //   dcontent      = %d33-90 / ; Printable US-ASCII
          //                 %d94-126 ; excl. "[", "\", "]"
          //
          //   Snum          = 1*3DIGIT
          //                 ; representing a decimal integer
          //                 ; value in the range 0 through 255
          //
          //   IPv6-addr     = IPv6-full / IPv6-comp / IPv6v4-full / IPv6v4-comp
          //
          //   IPv6-hex      = 1*4HEXDIG
          //
          //   IPv6-full     = IPv6-hex 7(":" IPv6-hex)
          //
          //   IPv6-comp     = [IPv6-hex *5(":" IPv6-hex)] "::"
          //                 [IPv6-hex *5(":" IPv6-hex)]
          //                 ; The "::" represents at least 2 16-bit groups of
          //                 ; zeros.  No more than 6 groups in addition to the
          //                 ; "::" may be present.
          //
          //   IPv6v4-full   = IPv6-hex 5(":" IPv6-hex) ":" IPv4-address-literal
          //
          //   IPv6v4-comp   = [IPv6-hex *3(":" IPv6-hex)] "::"
          //                 [IPv6-hex *3(":" IPv6-hex) ":"]
          //                 IPv4-address-literal
          //                 ; The "::" represents at least 2 16-bit groups of
          //                 ; zeros.  No more than 4 groups in addition to the
          //                 ; "::" and IPv4-address-literal may be present.
          //
          // is_email() author's note: We can't use ip2long() to validate
          // IPv4 addresses because it accepts abbreviated addresses
          // (xxx.xxx.xxx), expanding the last group to complete the address.
          // filter_var() validates IPv6 address inconsistently (up to PHP 5.3.3
          // at least) -- see http://bugs.php.net/bug.php?id=53236 for example

          // TODO: var here?
          var maxGroups = 8, matchesIP, index = false;
          var addressLiteral = parseData.literal;

          // maybe extract IPv4 part from the end of the address-literal
          if (matchesIP = IPv4_REGEX.exec(addressLiteral)) {
            if ((index = matchesIP.index) !== 0) {
              // convert IPv4 part to IPv6 format for futher testing
              addressLiteral = addressLiteral.slice(0, matchesIP.index) + '0:0';
            }
          }

          if (index === 0) {
            // nothing there except a valid IPv4 address, so...
            updateResult(ISEMAIL_RFC5321_ADDRESSLITERAL);
          } else if (addressLiteral.slice(0, 5).toLowerCase() !== 'ipv6:') {
            updateResult(ISEMAIL_RFC5322_DOMAINLITERAL);
          } else {
            var match = addressLiteral.substr(5);
            matchesIP = match.split(':');
            index = match.indexOf('::');

            if (!~index) {
              // need exactly the right number of groups
              if (matchesIP.length !== maxGroups) {
                updateResult(ISEMAIL_RFC5322_IPV6_GRPCOUNT);
              }
            } else if (index !== match.lastIndexOf('::')) {
              updateResult(ISEMAIL_RFC5322_IPV6_2X2XCOLON);
            } else {
              if (index === 0 || index === match.length - 2) {
                // RFC 4291 allows :: at the start or end of an address with
                // 7 other groups in addition
                maxGroups++;
              }

              if (matchesIP.length > maxGroups) {
                updateResult(ISEMAIL_RFC5322_IPV6_MAXGRPS);
              } else if (matchesIP.length === maxGroups) {
                // eliding a single "::"
                updateResult(ISEMAIL_RFC5321_IPV6DEPRECATED);
              }
            }

            // IPv6 testing strategy
            if (match[0] === ':' && match[1] !== ':') {
              updateResult(ISEMAIL_RFC5322_IPV6_COLONSTRT);
            } else if (match[match.length - 1] === ':' &&
                       match[match.length - 2] !== ':') {
              updateResult(ISEMAIL_RFC5322_IPV6_COLONEND);
            } else if (matchesIP.every(IPv6_REGEX_TEST)) {
              updateResult(ISEMAIL_RFC5321_ADDRESSLITERAL);
            } else {
              updateResult(ISEMAIL_RFC5322_IPV6_BADCHAR);
            }
          }
        } else {
          updateResult(ISEMAIL_RFC5322_DOMAINLITERAL);
        }

        parseData.domain += token;
        atomList.domain[elementCount] += token;
        elementLength++;
        context.prev = context.now;
        context.now = context.stack.pop();
        break;
      case '\\':
        updateResult(ISEMAIL_RFC5322_DOMLIT_OBSDTEXT);
        context.stack.push(context.now);
        context.now = CONTEXT_QUOTEDPAIR;
        break;
      // folding white space
      case '\r':
        if ((++i === email.length) || email[i] !== '\n') {
          // fatal error
          updateResult(ISEMAIL_ERR_CR_NO_LF);
          break;
        }
      case ' ':
      case '\t':
        updateResult(ISEMAIL_CFWS_FWS);

        context.stack.push(context.now);
        context.now = CONTEXT_FWS;
        prevToken = token;
        break;
      // dtext
      default:
        // http://tools.ietf.org/html/rfc5322#section-3.4.1
        //   dtext         =   %d33-90 /  ; Printable US-ASCII
        //                     %d94-126 / ;  characters not including
        //                     obs-dtext  ;  "[", "]", or "\"
        //
        //   obs-dtext     =   obs-NO-WS-CTL / quoted-pair
        //
        //   obs-NO-WS-CTL =   %d1-8 /    ; US-ASCII control
        //                     %d11 /     ;  characters that do not
        //                     %d12 /     ;  include the carriage
        //                     %d14-31 /  ;  return, line feed, and
        //                     %d127      ;  white space characters
        charCode = token.charCodeAt(0);

        // CR, LF, SP & HTAB have already been parsed above
        if (charCode > 127 || charCode === 0 || token === '[') {
          // fatal error
          updateResult(ISEMAIL_ERR_EXPECTING_DTEXT);
          break;
        } else if (charCode < 33 || charCode === 127) {
          updateResult(ISEMAIL_RFC5322_DOMLIT_OBSDTEXT);
        }

        parseData.literal += token;
        parseData.domain += token;
        atomList.domain[elementCount] += token;
        elementLength++;
      }
      break;
    // quoted string
    case CONTEXT_QUOTEDSTRING:
      // http://tools.ietf.org/html/rfc5322#section-3.2.4
      //   quoted-string = [CFWS]
      //                   DQUOTE *([FWS] qcontent) [FWS] DQUOTE
      //                   [CFWS]
      //
      //   qcontent      = qtext / quoted-pair
      switch (token) {
      // quoted pair
      case '\\':
        context.stack.push(context.now);
        context.now = CONTEXT_QUOTEDPAIR;
        break;
      // folding white space
      // inside a quoted string, spaces are allowed as regular characters
      // it's only FWS if we include HTAB or CRLF
      case '\r':
        if ((++i === email.length) || email[i] !== '\n') {
          // fatal error
          updateResult(ISEMAIL_ERR_CR_NO_LF);
          break;
        }
      case '\t':
        // http://tools.ietf.org/html/rfc5322#section-3.2.2
        //   Runs of FWS, comment, or CFWS that occur between lexical tokens in
        //   a structured header field are semantically interpreted as a single
        //   space character.

        // http://tools.ietf.org/html/rfc5322#section-3.2.4
        //   the CRLF in any FWS/CFWS that appears within the quoted-string [is]
        //   semantically "invisible" and therefore not part of the
        //   quoted-string

        parseData.local += ' ';
        atomList.local[elementCount] += ' ';
        elementLength++;

        updateResult(ISEMAIL_CFWS_FWS);
        context.stack.push(context.now);
        context.now = CONTEXT_FWS;
        prevToken = token;
        break;
      // end of quoted string
      case '"':
        parseData.local += token;
        atomList.local[elementCount] += token;
        elementLength++;
        context.prev = context.now;
        context.now = context.stack.pop();
        break;
      // qtext
      default:
        // http://tools.ietf.org/html/rfc5322#section-3.2.4
        //   qtext          =   %d33 /             ; Printable US-ASCII
        //                      %d35-91 /          ;  characters not including
        //                      %d93-126 /         ;  "\" or the quote character
        //                      obs-qtext
        //
        //   obs-qtext      =   obs-NO-WS-CTL
        //
        //   obs-NO-WS-CTL  =   %d1-8 /            ; US-ASCII control
        //                      %d11 /             ;  characters that do not
        //                      %d12 /             ;  include the carriage
        //                      %d14-31 /          ;  return, line feed, and
        //                      %d127              ;  white space characters
        charCode = token.charCodeAt(0);

        if (charCode > 127 || charCode === 0 || charCode === 10) {
          updateResult(ISEMAIL_ERR_EXPECTING_QTEXT);
        } else if (charCode < 32 || charCode === 127) {
          updateResult(ISEMAIL_DEPREC_QTEXT);
        }

        parseData.local += token;
        atomList.local[elementCount] += token;
        elementLength++;
      }

      // http://tools.ietf.org/html/rfc5322#section-3.4.1
      //   If the string can be represented as a dot-atom (that is, it contains
      //   no characters other than atext characters or "." surrounded by atext
      //   characters), then the dot-atom form SHOULD be used and the quoted-
      //   string form SHOULD NOT be used.

      break;
    // quoted pair
    case CONTEXT_QUOTEDPAIR:
      // http://tools.ietf.org/html/rfc5322#section-3.2.1
      //   quoted-pair     =   ("\" (VCHAR / WSP)) / obs-qp
      //
      //   VCHAR           =  %d33-126   ; visible (printing) characters
      //   WSP             =  SP / HTAB  ; white space
      //
      //   obs-qp          =   "\" (%d0 / obs-NO-WS-CTL / LF / CR)
      //
      //   obs-NO-WS-CTL   =   %d1-8 /   ; US-ASCII control
      //                       %d11 /    ;  characters that do not
      //                       %d12 /    ;  include the carriage
      //                       %d14-31 / ;  return, line feed, and
      //                       %d127     ;  white space characters
      //
      // i.e. obs-qp       =  "\" (%d0-8, %d10-31 / %d127)
      charCode = token.charCodeAt(0);

      if (charCode > 127) {
        // fatal error
        updateResult(ISEMAIL_ERR_EXPECTING_QPAIR);
      } else if ((charCode < 31 && charCode !== 9) || charCode === 127) {
        // SP & HTAB are allowed
        updateResult(ISEMAIL_DEPREC_QP);
      }

      // At this point we know where this qpair occurred so
      // we could check to see if the character actually
      // needed to be quoted at all.
      // http://tools.ietf.org/html/rfc5321#section-4.1.2
      //   the sending system SHOULD transmit the
      //   form that uses the minimum quoting possible.

      // TODO: check whether the character needs to be quoted (escaped)
      // in this context

      context.prev = context.now;
      context.now = context.stack.pop(); // end of qpair
      token = '\\' + token;

      switch (context.now) {
      case CONTEXT_COMMENT: break;
      case CONTEXT_QUOTEDSTRING:
        parseData.local += token;
        atomList.local[elementCount] += token;

        // the maximum sizes specified by RFC 5321 are octet counts,
        // so we must include the backslash
        elementLength += 2;
        break;
      case COMPONENT_LITERAL:
        parseData.domain += token;
        atomList.domain[elementCount] += token;

        // the maximum sizes specified by RFC 5321 are octet counts,
        // so we must include the backslash
        elementLength += 2;
        break;
      /* istanbul ignore next: logically unreachable */
      default:
        throw new Error('quoted pair logic invoked in an invalid context: ' +
          context.now);
      }
      break;
    // comment
    case CONTEXT_COMMENT:
      // http://tools.ietf.org/html/rfc5322#section-3.2.2
      //   comment  = "(" *([FWS] ccontent) [FWS] ")"
      //
      //   ccontent = ctext / quoted-pair / comment
      switch (token) {
      // nested comment
      case '(':
        // nested comments are ok
        context.stack.push(context.now);
        context.now = CONTEXT_COMMENT;
        break;
      // end of comment
      case ')':
        context.prev = context.now;
        context.now = context.stack.pop();

        break;
      // quoted pair
      case '\\':
        context.stack.push(context.now);
        context.now = CONTEXT_QUOTEDPAIR;
        break;
      // folding white space
      case '\r':
        if ((++i === email.length) || email[i] !== '\n') {
          // fatal error
          updateResult(ISEMAIL_ERR_CR_NO_LF);
          break;
        }
      case ' ':
      case '\t':
        updateResult(ISEMAIL_CFWS_FWS);

        context.stack.push(context.now);
        context.now = CONTEXT_FWS;
        prevToken = token;
        break;
      // ctext
      default:
        // http://tools.ietf.org/html/rfc5322#section-3.2.3
        //   ctext         = %d33-39 /  ; Printable US-ASCII
        //                   %d42-91 /  ;  characters not including
        //                   %d93-126 / ;  "(", ")", or "\"
        //                   obs-ctext
        //
        //   obs-ctext     = obs-NO-WS-CTL
        //
        //   obs-NO-WS-CTL = %d1-8 /    ; US-ASCII control
        //                   %d11 /     ;  characters that do not
        //                   %d12 /     ;  include the carriage
        //                   %d14-31 /  ;  return, line feed, and
        //                   %d127      ;  white space characters
        charCode = token.charCodeAt(0);

        if (charCode > 127 || charCode === 0 || charCode === 10) {
          // fatal error
          updateResult(ISEMAIL_ERR_EXPECTING_CTEXT);
          break;
        } else if (charCode < 32 || charCode === 127) {
          updateResult(ISEMAIL_DEPREC_CTEXT);
        }
      }
      break;
    // folding white space
    case CONTEXT_FWS:
      // http://tools.ietf.org/html/rfc5322#section-3.2.2
      //   FWS     =   ([*WSP CRLF] 1*WSP) /  obs-FWS
      //                                   ; Folding white space

      // But note the erratum:
      // http://www.rfc-editor.org/errata_search.php?rfc=5322&eid=1908:
      //   In the obsolete syntax, any amount of folding white space MAY be
      //   inserted where the obs-FWS rule is allowed.  This creates the
      //   possibility of having two consecutive "folds" in a line, and
      //   therefore the possibility that a line which makes up a folded header
      //   field could be composed entirely of white space.
      //
      //   obs-FWS =   1*([CRLF] WSP)

      if (prevToken === '\r') {
        if (token === '\r') {
          // fatal error
          updateResult(ISEMAIL_ERR_FWS_CRLF_X2);
          break;
        }

        if (++crlfCount > 1) {
          // multiple folds = obsolete FWS
          updateResult(ISEMAIL_DEPREC_FWS);
        } else {
          crlfCount = 1;
        }
      }

      switch (token) {
      case '\r':
        if ((++i === email.length) || email[i] !== '\n') {
          // fatal error
          updateResult(ISEMAIL_ERR_CR_NO_LF);
        }
        break;
      case ' ':
      case '\t':
        break;
      default:
        if (prevToken === '\r') {
          // fatal error
          updateResult(ISEMAIL_ERR_FWS_CRLF_END);
        }

        crlfCount = 0;

        context.prev = context.now;
        context.now = context.stack.pop(); // end of FWS

        i--; // look at this token again in the parent context
      }
      prevToken = token;
      break;
    // unexpected context
    /* istanbul ignore next: logically unreachable */
    default:
      throw new Error('unknown context: ' + context.now);
    } // primary state machine

    if (maxResult > ISEMAIL_RFC5322) {
      // fatal error, no point continuing
      break;
    }
  } // token loop

  // check for errors
  if (maxResult < ISEMAIL_RFC5322) {
    // fatal errors
    if (context.now === CONTEXT_QUOTEDSTRING) {
      updateResult(ISEMAIL_ERR_UNCLOSEDQUOTEDSTR);
    } else if (context.now === CONTEXT_QUOTEDPAIR) {
      updateResult(ISEMAIL_ERR_BACKSLASHEND);
    } else if (context.now === CONTEXT_COMMENT) {
      updateResult(ISEMAIL_ERR_UNCLOSEDCOMMENT);
    } else if (context.now === COMPONENT_LITERAL) {
      updateResult(ISEMAIL_ERR_UNCLOSEDDOMLIT);
    } else if (token === '\r') {
      updateResult(ISEMAIL_ERR_FWS_CRLF_END);
    } else if (parseData.domain.length === 0) {
      updateResult(ISEMAIL_ERR_NODOMAIN);
    } else if (elementLength === 0) {
      updateResult(ISEMAIL_ERR_DOT_END);
    } else if (hyphenFlag) {
      updateResult(ISEMAIL_ERR_DOMAINHYPHENEND);

    // other errors
    } else if (parseData.domain.length > 255) {
      // http://tools.ietf.org/html/rfc5321#section-4.5.3.1.2
      //   The maximum total length of a domain name or number is 255 octets.
      updateResult(ISEMAIL_RFC5322_DOMAIN_TOOLONG);
    } else if (parseData.local.length + parseData.domain.length + /* '@' */ 1 >
        254) {
      // http://tools.ietf.org/html/rfc5321#section-4.1.2
      //   Forward-path   = Path
      //
      //   Path           = "<" [ A-d-l ":" ] Mailbox ">"
      //
      // http://tools.ietf.org/html/rfc5321#section-4.5.3.1.3
      //   The maximum total length of a reverse-path or forward-path is 256
      //   octets (including the punctuation and element separators).
      //
      // Thus, even without (obsolete) routing information, the Mailbox can
      // only be 254 characters long. This is confirmed by this verified
      // erratum to RFC 3696:
      //
      // http://www.rfc-editor.org/errata_search.php?rfc=3696&eid=1690
      //   However, there is a restriction in RFC 2821 on the length of an
      //   address in MAIL and RCPT commands of 254 characters.  Since addresses
      //   that do not fit in those fields are not normally useful, the upper
      //   limit on address lengths should normally be considered to be 254.
      updateResult(ISEMAIL_RFC5322_TOOLONG);
    } else if (elementLength > 63) {
      // http://tools.ietf.org/html/rfc1035#section-2.3.4
      // labels   63 octets or less
      updateResult(ISEMAIL_RFC5322_LABEL_TOOLONG);
    } else if (options.minDomainAtoms && atomList.domain.length <
        options.minDomainAtoms) {
      updateResult(ISEMAIL_ERR_TOOSHORT_DOMAIN);
    } else if (options.tldWhitelist) {
      var tldAtom = atomList.domain[elementCount], tldValid = false, n;
      if (Array.isArray(options.tldWhitelist)) {
        for (i = 0, n = options.tldWhitelist.length; i < n; i++) {
          if (tldAtom === options.tldWhitelist[i]) {
            tldValid = true;
            break;
          }
        }
      } else {
        tldValid = hasOwn.call(options.tldWhitelist, tldAtom);
      }
      if (!tldValid) {
        updateResult(ISEMAIL_ERR_UNKNOWN_TLD);
      }
    }
  } // check for errors

  var dnsPositive = false;

  if (options.checkDNS && maxResult < ISEMAIL_DNSWARN && HAS_REQUIRE) {
    dns || (dns = require('dns'));
    // http://tools.ietf.org/html/rfc5321#section-2.3.5
    //   Names that can
    //   be resolved to MX RRs or address (i.e., A or AAAA) RRs (as discussed
    //   in Section 5) are permitted, as are CNAME RRs whose targets can be
    //   resolved, in turn, to MX or address RRs.
    //
    // http://tools.ietf.org/html/rfc5321#section-5.1
    //   The lookup first attempts to locate an MX record associated with the
    //   name.  If a CNAME record is found, the resulting name is processed as
    //   if it were the initial name. ... If an empty list of MXs is returned,
    //   the address is treated as if it was associated with an implicit MX
    //   RR, with a preference of 0, pointing to that host.
    //
    // isEmail() author's note: We will regard the existence of a CNAME to be
    // sufficient evidence of the domain's existence. For performance reasons
    // we will not repeat the DNS lookup for the CNAME's target, but we will
    // raise a warning because we didn't immediately find an MX record.
    if (elementCount === 0) {
      // checking TLD DNS only works if you explicitly check from the root
      parseData.domain += '.';
    }

    var dnsDomain = parseData.domain;
    dns.resolveMx(dnsDomain, function(err, records) {
      if ((err && err.code !== dns.NODATA) || (!err && !records)) {
        updateResult(ISEMAIL_DNSWARN_NO_RECORD);
        return finish();
      }
      if (records && records.length) {
        dnsPositive = true;
        return finish();
      }
      var done = false, count = 3;
      updateResult(ISEMAIL_DNSWARN_NO_MX_RECORD);
      dns.resolveCname(dnsDomain, handleRecords);
      dns.resolve4(dnsDomain, handleRecords);
      dns.resolve6(dnsDomain, handleRecords);
      function handleRecords(err, records) {
        if (done) return;
        count--;
        if (!err && records && records.length) {
          done = true;
          return finish();
        }
        if (count === 0) {
          // no usable records for the domain can be found
          updateResult(ISEMAIL_DNSWARN_NO_RECORD);
          done = true;
          finish();
        }
      }
    });
  } else if (options.checkDNS) {
    // guarantee asynchronicity
    typeof process !== 'undefined' && process &&
      typeof process.nextTick === 'function'
      ? process.nextTick(finish)
      : setTimeout(finish, 1);
  } else {
    return finish();
  } // checkDNS

  function finish() {
    if (!dnsPositive && maxResult < ISEMAIL_DNSWARN) {
      if (elementCount === 0) {
        updateResult(ISEMAIL_RFC5321_TLD);
      } else {
        var charCode = atomList.domain[elementCount].charCodeAt(0);
        if (charCode >= 48 && charCode <= 57) {
          updateResult(ISEMAIL_RFC5321_TLDNUMERIC);
        }
      }
    }

    if (maxResult < threshold) {
      maxResult = ISEMAIL_VALID;
    }

    if (!diagnose) {
      maxResult = maxResult < THRESHOLD;
    }

    if (typeof callback === 'function') {
      callback(maxResult);
    }

    return maxResult;
  } // finish
} // isEmail

module.exports = isEmail;

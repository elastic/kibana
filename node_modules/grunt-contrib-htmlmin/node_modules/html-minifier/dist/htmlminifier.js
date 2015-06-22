/*!
 * HTMLMinifier v0.5.6 (http://kangax.github.io/html-minifier/)
 * Copyright 2010-2014 Juriy "kangax" Zaytsev
 * Licensed under MIT (https://github.com/kangax/html-minifier/blob/gh-pages/LICENSE)
 */
/*!
 * HTML Parser By John Resig (ejohn.org)
 * Modified by Juriy "kangax" Zaytsev
 * Original code by Erik Arvidsson, Mozilla Public License
 * http://erik.eae.net/simplehtmlparser/simplehtmlparser.js
 */

/*
 * // Use like so:
 * HTMLParser(htmlString, {
 *     start: function(tag, attrs, unary) {},
 *     end: function(tag) {},
 *     chars: function(text) {},
 *     comment: function(text) {}
 * });
 *
 * // or to get an XML string:
 * HTMLtoXML(htmlString);
 *
 * // or to get an XML DOM Document
 * HTMLtoDOM(htmlString);
 *
 * // or to inject into an existing document/DOM node
 * HTMLtoDOM(htmlString, document);
 * HTMLtoDOM(htmlString, document.body);
 *
 */

 /* global ActiveXObject, DOMDocument */

(function(global) {
  'use strict';

  // Regular Expressions for parsing tags and attributes
  var startTag = /^<([\w:-]+)((?:\s*[\w:-]+(?:\s*=\s*(?:(?:"[^"]*")|(?:'[^']*')|[^>\s]+))?)*)\s*(\/?)>/,
      endTag = /^<\/([\w:-]+)[^>]*>/,
      endingSlash = /\/>$/,
      attr = /([\w:-]+)(?:\s*=\s*(?:(?:"((?:\\.|[^"])*)")|(?:'((?:\\.|[^'])*)')|([^>\s]+)))?/g,
      doctype = /^<!DOCTYPE [^>]+>/i,
      startIgnore = /<(%|\?)/,
      endIgnore = /(%|\?)>/;

  // Empty Elements - HTML 4.01
  var empty = makeMap('area,base,basefont,br,col,frame,hr,img,input,isindex,link,meta,param,embed');

  // Block Elements - HTML 4.01
  // var block = makeMap('address,applet,blockquote,button,center,dd,del,dir,div,dl,dt,fieldset,form,frameset,hr,iframe,ins,isindex,li,map,menu,noframes,noscript,object,ol,p,pre,script,table,tbody,td,tfoot,th,thead,tr,ul');

  // Inline Elements - HTML 4.01
  var inline = makeMap('a,abbr,acronym,applet,b,basefont,bdo,big,br,button,cite,code,del,dfn,em,font,i,iframe,img,input,ins,kbd,label,map,object,q,s,samp,script,select,small,span,strike,strong,sub,sup,textarea,tt,u,var');

  // Elements that you can, intentionally, leave open
  // (and which close themselves)
  var closeSelf = makeMap('colgroup,dd,dt,li,options,p,td,tfoot,th,thead,tr,source');

  // Attributes that have their values filled in disabled='disabled'
  var fillAttrs = makeMap('checked,compact,declare,defer,disabled,ismap,multiple,nohref,noresize,noshade,nowrap,readonly,selected');

  // Special Elements (can contain anything)
  var special = makeMap('script,style');

  var reCache = {}, stackedTag, reStackedTag, tagMatch;

  var HTMLParser = global.HTMLParser = function( html, handler ) {
    var index, chars, match, stack = [], last = html, prevTag, nextTag;
    stack.last = function() {
      return this[ this.length - 1 ];
    };

    while ( html ) {
      chars = true;

      // Make sure we're not in a script or style element
      if ( !stack.last() || !special[ stack.last() ] ) {

        // Comment:
        if ( html.indexOf('<!--') === 0 ) {
          index = html.indexOf('-->');

          if ( index >= 0 ) {
            if ( handler.comment ) {
              handler.comment( html.substring( 4, index ) );
            }
            html = html.substring( index + 3 );
            chars = false;
          }
        }

        // Ignored elements?
        else if (html.search(startIgnore) === 0) {
          index = html.search(endIgnore); // Find closing tag.
          if (index >= 0) { // Found?
            // @TODO: Pass matched open/close tags back to handler.
            handler.ignore && handler.ignore(html.substring(0, index + 2)); // Return ignored string if callback exists.
            html = html.substring(index + 2); // Next starting point for parser.
            chars = false; // Chars flag.
          }
        }

        // Doctype:
        else if ( (match = doctype.exec( html )) ) {
          if ( handler.doctype ) {
            handler.doctype( match[0] );
          }
          html = html.substring( match[0].length );
          chars = false;
        }

        // End tag:
        else if ( html.indexOf('</') === 0 ) {
          match = html.match( endTag );

          if ( match ) {
            html = html.substring( match[0].length );
            match[0].replace( endTag, parseEndTag );
            prevTag = '/' + match[1];
            chars = false;
          }

        // Start tag:
        }
        else if ( html.indexOf('<') === 0 ) {
          match = html.match( startTag );

          if ( match ) {
            html = html.substring( match[0].length );
            match[0].replace( startTag, parseStartTag );
            prevTag = match[1];
            chars = false;
          }
        }

        if ( chars ) {
          index = html.indexOf('<');

          var text = index < 0 ? html : html.substring( 0, index );
          html = index < 0 ? '' : html.substring( index );

          // next tag
          tagMatch = html.match( startTag );
          if (tagMatch) {
            nextTag = tagMatch[1];
          }
          else {
            tagMatch = html.match( endTag );
            if (tagMatch) {
              nextTag = '/' + tagMatch[1];
            }
            else {
              nextTag = '';
            }
          }

          if ( handler.chars ) {
            handler.chars(text, prevTag, nextTag);
          }

        }

      }
      else {

        stackedTag = stack.last().toLowerCase();
        reStackedTag = reCache[stackedTag] || (reCache[stackedTag] = new RegExp('([\\s\\S]*?)<\/' + stackedTag + '[^>]*>', 'i'));

        html = html.replace(reStackedTag, function(all, text) {
          if (stackedTag !== 'script' && stackedTag !== 'style') {
            text = text
              .replace(/<!--([\s\S]*?)-->/g, '$1')
              .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1');
          }

          if ( handler.chars ) {
            handler.chars( text );
          }

          return '';
        });

        parseEndTag( '', stackedTag );
      }

      if ( html === last ) {
        throw 'Parse Error: ' + html;
      }
      last = html;
    }

    // Clean up any remaining tags
    parseEndTag();

    function parseStartTag( tag, tagName, rest, unary ) {
      var unarySlash = false;

      while ( !handler.html5 && stack.last() && inline[ stack.last() ]) {
        parseEndTag( '', stack.last() );
      }

      if ( closeSelf[ tagName ] && stack.last() === tagName ) {
        parseEndTag( '', tagName );
      }

      unary = empty[ tagName ] || !!unary;

      if ( !unary ) {
        stack.push( tagName );
      }
      else {
        unarySlash = tag.match( endingSlash );
      }

      if ( handler.start ) {
        var attrs = [];

        rest.replace(attr, function(match, name) {
          var value = arguments[2] ? arguments[2] :
            arguments[3] ? arguments[3] :
            arguments[4] ? arguments[4] :
            fillAttrs[name] ? name : '';
          attrs.push({
            name: name,
            value: value,
            escaped: value.replace(/(^|[^\\])"/g, '$1&quot;') //"
          });
        });

        if ( handler.start ) {
          handler.start( tagName, attrs, unary, unarySlash );
        }
      }
    }

    function parseEndTag( tag, tagName ) {
      var pos;

      // If no tag name is provided, clean shop
      if ( !tagName ) {
        pos = 0;
      }
      else {      // Find the closest opened tag of the same type
        for ( pos = stack.length - 1; pos >= 0; pos-- ) {
          if ( stack[ pos ] === tagName ) {
            break;
          }
        }
      }

      if ( pos >= 0 ) {
        // Close all the open elements, up the stack
        for ( var i = stack.length - 1; i >= pos; i-- ) {
          if ( handler.end ) {
            handler.end( stack[ i ] );
          }
        }

        // Remove the open elements from the stack
        stack.length = pos;
      }
    }
  };

  global.HTMLtoXML = function( html ) {
    var results = '';

    new HTMLParser(html, {
      start: function( tag, attrs, unary ) {
        results += '<' + tag;

        for ( var i = 0; i < attrs.length; i++ ) {
          results += ' ' + attrs[i].name + '="' + attrs[i].escaped + '"';
        }

        results += (unary ? '/' : '') + '>';
      },
      end: function( tag ) {
        results += '</' + tag + '>';
      },
      chars: function( text ) {
        results += text;
      },
      comment: function( text ) {
        results += '<!--' + text + '-->';
      },
      ignore: function(text) {
        results += text;
      }
    });

    return results;
  };

  global.HTMLtoDOM = function( html, doc ) {
    // There can be only one of these elements
    var one = makeMap('html,head,body,title');

    // Enforce a structure for the document
    var structure = {
      link: 'head',
      base: 'head'
    };

    if ( !doc ) {
      if ( typeof DOMDocument !== 'undefined' ) {
        doc = new DOMDocument();
      }
      else if ( typeof document !== 'undefined' && document.implementation && document.implementation.createDocument ) {
        doc = document.implementation.createDocument('', '', null);
      }
      else if ( typeof ActiveX !== 'undefined' ) {
        doc = new ActiveXObject('Msxml.DOMDocument');
      }

    }
    else {
      doc = doc.ownerDocument ||
        doc.getOwnerDocument && doc.getOwnerDocument() ||
        doc;
    }

    var elems = [],
      documentElement = doc.documentElement ||
        doc.getDocumentElement && doc.getDocumentElement();

    // If we're dealing with an empty document then we
    // need to pre-populate it with the HTML document structure
    if ( !documentElement && doc.createElement ) {
      (function() {
        var html = doc.createElement('html');
        var head = doc.createElement('head');
        head.appendChild( doc.createElement('title') );
        html.appendChild( head );
        html.appendChild( doc.createElement('body') );
        doc.appendChild( html );
      })();
    }

    // Find all the unique elements
    if ( doc.getElementsByTagName ) {
      for ( var i in one ) {
        one[ i ] = doc.getElementsByTagName( i )[0];
      }
    }

    // If we're working with a document, inject contents into
    // the body element
    var curParentNode = one.body;

    new HTMLParser( html, {
      start: function( tagName, attrs, unary ) {
        // If it's a pre-built element, then we can ignore
        // its construction
        if ( one[ tagName ] ) {
          curParentNode = one[ tagName ];
          return;
        }

        var elem = doc.createElement( tagName );

        for ( var attr in attrs ) {
          elem.setAttribute( attrs[ attr ].name, attrs[ attr ].value );
        }

        if ( structure[ tagName ] && typeof one[ structure[ tagName ] ] !== 'boolean' ) {
          one[ structure[ tagName ] ].appendChild( elem );
        }
        else if ( curParentNode && curParentNode.appendChild ) {
          curParentNode.appendChild( elem );
        }

        if ( !unary ) {
          elems.push( elem );
          curParentNode = elem;
        }
      },
      end: function( /* tag */ ) {
        elems.length -= 1;

        // Init the new parentNode
        curParentNode = elems[ elems.length - 1 ];
      },
      chars: function( text ) {
        curParentNode.appendChild( doc.createTextNode( text ) );
      },
      comment: function( /*text*/ ) {
        // create comment node
      },
      ignore: function( /* text */ ) {
        // What to do here?
      }
    });

    return doc;
  };

  function makeMap(str) {
    var obj = {}, items = str.split(',');
    for ( var i = 0; i < items.length; i++ ) {
      obj[ items[i] ] = true;
      obj[ items[i].toUpperCase() ] = true;
    }
    return obj;
  }
})(typeof exports === 'undefined' ? this : exports);

(function(global) {
  'use strict';

  var log, HTMLParser;
  if (global.console && global.console.log) {
    log = function(message) {
      // "preserving" `this`
      global.console.log(message);
    };
  }
  else {
    log = function() {};
  }

  if (global.HTMLParser) {
    HTMLParser = global.HTMLParser;
  }
  else if (typeof require === 'function') {
    HTMLParser = require('./htmlparser').HTMLParser;
  }

  var trimWhitespace = function(str) {
    return str.replace(/^\s+/, '').replace(/\s+$/, '');
  };
  if (String.prototype.trim) {
    trimWhitespace = function(str) {
      return str.trim();
    };
  }

  function collapseWhitespace(str) {
    return str.replace(/\s+/g, ' ');
  }

  function collapseWhitespaceSmart(str, prevTag, nextTag) {
    // array of tags that will maintain a single space outside of them
    var tags = ['a', 'abbr', 'acronym', 'b', 'bdi', 'bdo', 'big', 'button', 'cite', 'code', 'del', 'dfn', 'em', 'font', 'i', 'ins', 'kbd', 'mark', 'q', 'rt', 'rp', 's', 'samp', 'small', 'span', 'strike', 'strong', 'sub', 'sup', 'time', 'tt', 'u', 'var'];

    if (prevTag && prevTag !== 'img' && (prevTag.substr(0,1) !== '/'
      || ( prevTag.substr(0,1) === '/' && tags.indexOf(prevTag.substr(1)) === -1))) {
      str = str.replace(/^\s+/, '');
    }

    if (nextTag && nextTag !== 'img' && (nextTag.substr(0,1) === '/'
      || ( nextTag.substr(0,1) !== '/' && tags.indexOf(nextTag) === -1))) {
      str = str.replace(/\s+$/, '');
    }

    if (prevTag && nextTag) {
      // strip non space whitespace then compress spaces to one
      return str.replace(/[\t\n\r]+/g, ' ').replace(/[ ]+/g, ' ');
    }

    return str;
  }

  function isConditionalComment(text) {
    return ((/\[if[^\]]+\]/).test(text) || (/\s*(<!\[endif\])$/).test(text));
  }

  function isIgnoredComment(text) {
    return (/^!/).test(text);
  }

  function isEventAttribute(attrName) {
    return (/^on[a-z]+/).test(attrName);
  }

  function canRemoveAttributeQuotes(value) {
    // http://mathiasbynens.be/notes/unquoted-attribute-values
    return (/^[^\x20\t\n\f\r"'`=<>]+$/).test(value) && !(/\/$/ ).test(value) &&
    // make sure trailing slash is not interpreted as HTML self-closing tag
        !(/\/$/).test(value);
  }

  function attributesInclude(attributes, attribute) {
    for (var i = attributes.length; i--; ) {
      if (attributes[i].name.toLowerCase() === attribute) {
        return true;
      }
    }
    return false;
  }

  function isAttributeRedundant(tag, attrName, attrValue, attrs) {
    attrValue = trimWhitespace(attrValue.toLowerCase());
    return (
        (tag === 'script' &&
        attrName === 'language' &&
        attrValue === 'javascript') ||

        (tag === 'form' &&
        attrName === 'method' &&
        attrValue === 'get') ||

        (tag === 'input' &&
        attrName === 'type' &&
        attrValue === 'text') ||

        (tag === 'script' &&
        attrName === 'charset' &&
        !attributesInclude(attrs, 'src')) ||

        (tag === 'a' &&
        attrName === 'name' &&
        attributesInclude(attrs, 'id')) ||

        (tag === 'area' &&
        attrName === 'shape' &&
        attrValue === 'rect')
    );
  }

  function isScriptTypeAttribute(tag, attrName, attrValue) {
    return (
      tag === 'script' &&
      attrName === 'type' &&
      trimWhitespace(attrValue.toLowerCase()) === 'text/javascript'
    );
  }

  function isStyleLinkTypeAttribute(tag, attrName, attrValue) {
    return (
      (tag === 'style' || tag === 'link') &&
      attrName === 'type' &&
      trimWhitespace(attrValue.toLowerCase()) === 'text/css'
    );
  }

  function isBooleanAttribute(attrName) {
    return (/^(?:allowfullscreen|async|autofocus|checked|compact|declare|default|defer|disabled|formnovalidate|hidden|inert|ismap|itemscope|multiple|muted|nohref|noresize|noshade|novalidate|nowrap|open|readonly|required|reversed|seamless|selected|sortable|truespeed|typemustmatch)$/).test(attrName);
  }

  function isUriTypeAttribute(attrName, tag) {
    return (
      ((/^(?:a|area|link|base)$/).test(tag) && attrName === 'href') ||
      (tag === 'img' && (/^(?:src|longdesc|usemap)$/).test(attrName)) ||
      (tag === 'object' && (/^(?:classid|codebase|data|usemap)$/).test(attrName)) ||
      (tag === 'q' && attrName === 'cite') ||
      (tag === 'blockquote' && attrName === 'cite') ||
      ((tag === 'ins' || tag === 'del') && attrName === 'cite') ||
      (tag === 'form' && attrName === 'action') ||
      (tag === 'input' && (attrName === 'src' || attrName === 'usemap')) ||
      (tag === 'head' && attrName === 'profile') ||
      (tag === 'script' && (attrName === 'src' || attrName === 'for'))
    );
  }

  function isNumberTypeAttribute(attrName, tag) {
    return (
      ((/^(?:a|area|object|button)$/).test(tag) && attrName === 'tabindex') ||
      (tag === 'input' && (attrName === 'maxlength' || attrName === 'tabindex')) ||
      (tag === 'select' && (attrName === 'size' || attrName === 'tabindex')) ||
      (tag === 'textarea' && (/^(?:rows|cols|tabindex)$/).test(attrName)) ||
      (tag === 'colgroup' && attrName === 'span') ||
      (tag === 'col' && attrName === 'span') ||
      ((tag === 'th' || tag === 'td') && (attrName === 'rowspan' || attrName === 'colspan'))
    );
  }

  function cleanAttributeValue(tag, attrName, attrValue) {
    if (isEventAttribute(attrName)) {
      return trimWhitespace(attrValue).replace(/^javascript:\s*/i, '').replace(/\s*;$/, '');
    }
    else if (attrName === 'class') {
      return collapseWhitespace(trimWhitespace(attrValue));
    }
    else if (isUriTypeAttribute(attrName, tag) || isNumberTypeAttribute(attrName, tag)) {
      return trimWhitespace(attrValue);
    }
    else if (attrName === 'style') {
      return trimWhitespace(attrValue).replace(/\s*;\s*$/, '');
    }
    return attrValue;
  }

  function cleanConditionalComment(comment) {
    return comment
      .replace(/^(\[[^\]]+\]>)\s*/, '$1')
      .replace(/\s*(<!\[endif\])$/, '$1');
  }

  function removeCDATASections(text) {
    return text
      // "/* <![CDATA[ */" or "// <![CDATA["
      .replace(/^(?:\s*\/\*\s*<!\[CDATA\[\s*\*\/|\s*\/\/\s*<!\[CDATA\[.*)/, '')
      // "/* ]]> */" or "// ]]>"
      .replace(/(?:\/\*\s*\]\]>\s*\*\/|\/\/\s*\]\]>)\s*$/, '');
  }

  var reStartDelimiter = {
    // account for js + html comments (e.g.: //<!--)
    script: /^\s*(?:\/\/)?\s*<!--.*\n?/,
    style: /^\s*<!--\s*/
  };
  var reEndDelimiter = {
    script: /\s*(?:\/\/)?\s*-->\s*$/,
    style: /\s*-->\s*$/
  };
  function removeComments(text, tag) {
    return text.replace(reStartDelimiter[tag], '').replace(reEndDelimiter[tag], '');
  }

  function isOptionalTag(tag) {
    return (/^(?:html|t?body|t?head|tfoot|tr|td|th|option|source)$/).test(tag);
  }

  var reEmptyAttribute = new RegExp(
    '^(?:class|id|style|title|lang|dir|on(?:focus|blur|change|click|dblclick|mouse(' +
      '?:down|up|over|move|out)|key(?:press|down|up)))$');

  function canDeleteEmptyAttribute(tag, attrName, attrValue) {
    var isValueEmpty = /^(["'])?\s*\1$/.test(attrValue);
    if (isValueEmpty) {
      return (
        (tag === 'input' && attrName === 'value') ||
        reEmptyAttribute.test(attrName));
    }
    return false;
  }

  function canRemoveElement(tag) {
    return tag !== 'textarea';
  }

  function canCollapseWhitespace(tag) {
    return !(/^(?:script|style|pre|textarea)$/.test(tag));
  }

  function canTrimWhitespace(tag) {
    return !(/^(?:pre|textarea)$/.test(tag));
  }

  function normalizeAttribute(attr, attrs, tag, options) {

    var attrName = options.caseSensitive ? attr.name : attr.name.toLowerCase(),
        attrValue = attr.escaped,
        attrFragment;

    if ((options.removeRedundantAttributes &&
      isAttributeRedundant(tag, attrName, attrValue, attrs))
      ||
      (options.removeScriptTypeAttributes &&
      isScriptTypeAttribute(tag, attrName, attrValue))
      ||
      (options.removeStyleLinkTypeAttributes &&
      isStyleLinkTypeAttribute(tag, attrName, attrValue))) {
      return '';
    }

    attrValue = cleanAttributeValue(tag, attrName, attrValue);

    if (!options.removeAttributeQuotes ||
        !canRemoveAttributeQuotes(attrValue)) {
      attrValue = '"' + attrValue + '"';
    }

    if (options.removeEmptyAttributes &&
        canDeleteEmptyAttribute(tag, attrName, attrValue)) {
      return '';
    }

    if (options.collapseBooleanAttributes &&
        isBooleanAttribute(attrName)) {
      attrFragment = attrName;
    }
    else {
      attrFragment = attrName + '=' + attrValue;
    }

    return (' ' + attrFragment);
  }

  function setDefaultTesters(options) {

    var defaultTesters = ['canCollapseWhitespace','canTrimWhitespace'];

    for (var i = 0, len = defaultTesters.length; i < len; i++) {
      if (!options[defaultTesters[i]]) {
        options[defaultTesters[i]] = function() {
          return false;
        };
      }
    }
  }

  function minify(value, options) {

    options = options || {};
    value = trimWhitespace(value);
    setDefaultTesters(options);

    var results = [ ],
        buffer = [ ],
        currentChars = '',
        currentTag = '',
        currentAttrs = [],
        stackNoTrimWhitespace = [],
        stackNoCollapseWhitespace = [],
        lint = options.lint,
        t = new Date();

    function _canCollapseWhitespace(tag, attrs) {
      return canCollapseWhitespace(tag) || options.canCollapseWhitespace(tag, attrs);
    }

    function _canTrimWhitespace(tag, attrs) {
      return canTrimWhitespace(tag) || options.canTrimWhitespace(tag, attrs);
    }

    new HTMLParser(value, {
      html5: typeof options.html5 !== 'undefined' ? options.html5 : true,

      start: function( tag, attrs, unary, unarySlash ) {
        tag = tag.toLowerCase();
        currentTag = tag;
        currentChars = '';
        currentAttrs = attrs;

        // set whitespace flags for nested tags (eg. <code> within a <pre>)
        if (options.collapseWhitespace) {
          if (!_canTrimWhitespace(tag, attrs)) {
            stackNoTrimWhitespace.push(tag);
          }
          if (!_canCollapseWhitespace(tag, attrs)) {
            stackNoCollapseWhitespace.push(tag);
          }
        }

        buffer.push('<', tag);

        lint && lint.testElement(tag);

        for ( var i = 0, len = attrs.length; i < len; i++ ) {
          lint && lint.testAttribute(tag, attrs[i].name.toLowerCase(), attrs[i].escaped);
          buffer.push(normalizeAttribute(attrs[i], attrs, tag, options));
        }
        buffer.push(((unarySlash && options.keepClosingSlash) ? '/' : '') + '>');
      },
      end: function( tag ) {
        // check if current tag is in a whitespace stack
        if (options.collapseWhitespace) {
          if (stackNoTrimWhitespace.length &&
            tag === stackNoTrimWhitespace[stackNoTrimWhitespace.length - 1]) {
            stackNoTrimWhitespace.pop();
          }
          if (stackNoCollapseWhitespace.length &&
            tag === stackNoCollapseWhitespace[stackNoCollapseWhitespace.length - 1]) {
            stackNoCollapseWhitespace.pop();
          }
        }

        var isElementEmpty = currentChars === '' && tag === currentTag;
        if ((options.removeEmptyElements && isElementEmpty && canRemoveElement(tag))) {
          // remove last "element" from buffer, return
          buffer.splice(buffer.lastIndexOf('<'));
          return;
        }
        else if (options.removeOptionalTags && isOptionalTag(tag)) {
          // noop, leave start tag in buffer
          return;
        }
        else {
          // push end tag to buffer
          buffer.push('</', tag.toLowerCase(), '>');
          results.push.apply(results, buffer);
        }
        // flush buffer
        buffer.length = 0;
        currentChars = '';
      },
      chars: function( text, prevTag, nextTag ) {
        if (currentTag === 'script' || currentTag === 'style') {
          if (options.removeCommentsFromCDATA) {
            text = removeComments(text, currentTag);
          }
          if (options.removeCDATASectionsFromCDATA) {
            text = removeCDATASections(text);
          }
        }
        if (options.collapseWhitespace) {
          if (!stackNoTrimWhitespace.length) {
            text = (prevTag || nextTag) ? collapseWhitespaceSmart(text, prevTag, nextTag) : trimWhitespace(text);
          }
          if (!stackNoCollapseWhitespace.length) {
            text = collapseWhitespace(text);
          }
        }
        currentChars = text;
        lint && lint.testChars(text);
        buffer.push(text);
      },
      comment: function( text ) {
        if (options.removeComments) {
          if (isConditionalComment(text)) {
            text = '<!--' + cleanConditionalComment(text) + '-->';
          }
          else if (isIgnoredComment(text)) {
            text = '<!--' + text + '-->';
          }
          else {
            text = '';
          }
        }
        else {
          text = '<!--' + text + '-->';
        }
        buffer.push(text);
      },
      ignore: function(text) {
        // `text` === strings that start with `<?` or `<%` and end with `?>` or `%>`.
        buffer.push(options.removeIgnored ? '' : text); // `text` allowed by default.
      },
      doctype: function(doctype) {
        buffer.push(options.useShortDoctype ? '<!DOCTYPE html>' : collapseWhitespace(doctype));
      }
    });

    results.push.apply(results, buffer);
    var str = results.join('');
    log('minified in: ' + (new Date() - t) + 'ms');
    return str;
  }

  // for CommonJS enviroments, export everything
  if ( typeof exports !== 'undefined' ) {
    exports.minify = minify;
  }
  else {
    global.minify = minify;
  }

}(this));

/*!
 * HTMLLint (to be used in conjunction with HTMLMinifier)
 *
 * Copyright (c) 2010-2013 Juriy "kangax" Zaytsev
 * Licensed under the MIT license.
 *
 */

(function(global) {
  'use strict';

  function isPresentationalElement(tag) {
    return (/^(?:b|i|big|small|hr|blink|marquee)$/).test(tag);
  }
  function isDeprecatedElement(tag) {
    return (/^(?:applet|basefont|center|dir|font|isindex|s|strike|u)$/).test(tag);
  }
  function isEventAttribute(attrName) {
    return (/^on[a-z]+/).test(attrName);
  }
  function isStyleAttribute(attrName) {
    return ('style' === attrName.toLowerCase());
  }
  function isDeprecatedAttribute(tag, attrName) {
    return (
      (attrName === 'align' &&
      (/^(?:caption|applet|iframe|img|imput|object|legend|table|hr|div|h[1-6]|p)$/).test(tag)) ||
      (attrName === 'alink' && tag === 'body') ||
      (attrName === 'alt' && tag === 'applet') ||
      (attrName === 'archive' && tag === 'applet') ||
      (attrName === 'background' && tag === 'body') ||
      (attrName === 'bgcolor' && (/^(?:table|t[rdh]|body)$/).test(tag)) ||
      (attrName === 'border' && (/^(?:img|object)$/).test(tag)) ||
      (attrName === 'clear' && tag === 'br') ||
      (attrName === 'code' && tag === 'applet') ||
      (attrName === 'codebase' && tag === 'applet') ||
      (attrName === 'color' && (/^(?:base(?:font)?)$/).test(tag)) ||
      (attrName === 'compact' && (/^(?:dir|[dou]l|menu)$/).test(tag)) ||
      (attrName === 'face' && (/^base(?:font)?$/).test(tag)) ||
      (attrName === 'height' && (/^(?:t[dh]|applet)$/).test(tag)) ||
      (attrName === 'hspace' && (/^(?:applet|img|object)$/).test(tag)) ||
      (attrName === 'language' && tag === 'script') ||
      (attrName === 'link' && tag === 'body') ||
      (attrName === 'name' && tag === 'applet') ||
      (attrName === 'noshade' && tag === 'hr') ||
      (attrName === 'nowrap' && (/^t[dh]$/).test(tag)) ||
      (attrName === 'object' && tag === 'applet') ||
      (attrName === 'prompt' && tag === 'isindex') ||
      (attrName === 'size' && (/^(?:hr|font|basefont)$/).test(tag)) ||
      (attrName === 'start' && tag === 'ol') ||
      (attrName === 'text' && tag === 'body') ||
      (attrName === 'type' && (/^(?:li|ol|ul)$/).test(tag)) ||
      (attrName === 'value' && tag === 'li') ||
      (attrName === 'version' && tag === 'html') ||
      (attrName === 'vlink' && tag === 'body') ||
      (attrName === 'vspace' && (/^(?:applet|img|object)$/).test(tag)) ||
      (attrName === 'width' && (/^(?:hr|td|th|applet|pre)$/).test(tag))
    );
  }
  function isInaccessibleAttribute(attrName, attrValue) {
    return (
      attrName === 'href' &&
      (/^\s*javascript\s*:\s*void\s*(\s+0|\(\s*0\s*\))\s*$/i).test(attrValue)
    );
  }

  function Lint() {
    this.log = [ ];
    this._lastElement = null;
    this._isElementRepeated = false;
  }

  Lint.prototype.testElement = function(tag) {
    if (isDeprecatedElement(tag)) {
      this.log.push(
        '<li>Found <span class="deprecated-element">deprecated</span> <strong><code>&lt;' +
          tag + '&gt;</code></strong> element</li>'
      );
    }
    else if (isPresentationalElement(tag)) {
      this.log.push(
        '<li>Found <span class="presentational-element">presentational</span> <strong><code>&lt;' +
          tag + '&gt;</code></strong> element</li>'
      );
    }
    else {
      this.checkRepeatingElement(tag);
    }
  };

  Lint.prototype.checkRepeatingElement = function(tag) {
    if (tag === 'br' && this._lastElement === 'br') {
      this._isElementRepeated = true;
    }
    else if (this._isElementRepeated) {
      this._reportRepeatingElement();
      this._isElementRepeated = false;
    }
    this._lastElement = tag;
  };

  Lint.prototype._reportRepeatingElement = function() {
    this.log.push('<li>Found <code>&lt;br></code> sequence. Try replacing it with styling.</li>');
  };

  Lint.prototype.testAttribute = function(tag, attrName, attrValue) {
    if (isEventAttribute(attrName)) {
      this.log.push(
        '<li>Found <span class="event-attribute">event attribute</span> (<strong>',
        attrName, '</strong>) on <strong><code>&lt;' + tag + '&gt;</code></strong> element</li>'
      );
    }
    else if (isDeprecatedAttribute(tag, attrName)) {
      this.log.push(
        '<li>Found <span class="deprecated-attribute">deprecated</span> <strong>' +
          attrName + '</strong> attribute on <strong><code>&lt;', tag, '&gt;</code></strong> element</li>'
      );
    }
    else if (isStyleAttribute(attrName)) {
      this.log.push(
        '<li>Found <span class="style-attribute">style attribute</span> on <strong><code>&lt;', tag, '&gt;</code></strong> element</li>'
      );
    }
    else if (isInaccessibleAttribute(attrName, attrValue)) {
      this.log.push(
        '<li>Found <span class="inaccessible-attribute">inaccessible attribute</span> ' +
          '(on <strong><code>&lt;', tag, '&gt;</code></strong> element)</li>'
      );
    }
  };

  Lint.prototype.testChars = function(chars) {
    this._lastElement = '';
    if (/(&nbsp;\s*){2,}/.test(chars)) {
      this.log.push('<li>Found repeating <strong><code>&amp;nbsp;</code></strong> sequence. Try replacing it with styling.</li>');
    }
  };

  Lint.prototype.test = function(tag, attrName, attrValue) {
    this.testElement(tag);
    this.testAttribute(tag, attrName, attrValue);
  };

  Lint.prototype.populate = function(writeToElement) {
    if (this._isElementRepeated) {
      this._reportRepeatingElement();
    }
    var report;
    if (this.log.length && writeToElement) {
      report = '<ol>' + this.log.join('') + '</ol>';
      writeToElement.innerHTML = report;
    }
  };

  global.HTMLLint = Lint;

})(typeof exports === 'undefined' ? this : exports);

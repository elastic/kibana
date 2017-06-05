/*!
 * XRegExp 2.0.0 <xregexp.com> MIT License
 */
var XRegExp;XRegExp=XRegExp||function(n){"use strict";function v(n,i,r){var u;for(u in t.prototype)t.prototype.hasOwnProperty(u)&&(n[u]=t.prototype[u]);return n.xregexp={captureNames:i,isNative:!!r},n}function g(n){return(n.global?"g":"")+(n.ignoreCase?"i":"")+(n.multiline?"m":"")+(n.extended?"x":"")+(n.sticky?"y":"")}function o(n,r,u){if(!t.isRegExp(n))throw new TypeError("type RegExp expected");var f=i.replace.call(g(n)+(r||""),h,"");return u&&(f=i.replace.call(f,new RegExp("["+u+"]+","g"),"")),n=n.xregexp&&!n.xregexp.isNative?v(t(n.source,f),n.xregexp.captureNames?n.xregexp.captureNames.slice(0):null):v(new RegExp(n.source,f),null,!0)}function a(n,t){var i=n.length;if(Array.prototype.lastIndexOf)return n.lastIndexOf(t);while(i--)if(n[i]===t)return i;return-1}function s(n,t){return Object.prototype.toString.call(n).toLowerCase()==="[object "+t+"]"}function d(n){return n=n||{},n==="all"||n.all?n={natives:!0,extensibility:!0}:s(n,"string")&&(n=t.forEach(n,/[^\s,]+/,function(n){this[n]=!0},{})),n}function ut(n,t,i,u){var o=p.length,s=null,e,f;y=!0;try{while(o--)if(f=p[o],(f.scope==="all"||f.scope===i)&&(!f.trigger||f.trigger.call(u))&&(f.pattern.lastIndex=t,e=r.exec.call(f.pattern,n),e&&e.index===t)){s={output:f.handler.call(u,e,i),match:e};break}}catch(h){throw h;}finally{y=!1}return s}function b(n){t.addToken=c[n?"on":"off"],f.extensibility=n}function tt(n){RegExp.prototype.exec=(n?r:i).exec,RegExp.prototype.test=(n?r:i).test,String.prototype.match=(n?r:i).match,String.prototype.replace=(n?r:i).replace,String.prototype.split=(n?r:i).split,f.natives=n}var t,c,u,f={natives:!1,extensibility:!1},i={exec:RegExp.prototype.exec,test:RegExp.prototype.test,match:String.prototype.match,replace:String.prototype.replace,split:String.prototype.split},r={},k={},p=[],e="default",rt="class",it={"default":/^(?:\\(?:0(?:[0-3][0-7]{0,2}|[4-7][0-7]?)?|[1-9]\d*|x[\dA-Fa-f]{2}|u[\dA-Fa-f]{4}|c[A-Za-z]|[\s\S])|\(\?[:=!]|[?*+]\?|{\d+(?:,\d*)?}\??)/,"class":/^(?:\\(?:[0-3][0-7]{0,2}|[4-7][0-7]?|x[\dA-Fa-f]{2}|u[\dA-Fa-f]{4}|c[A-Za-z]|[\s\S]))/},et=/\$(?:{([\w$]+)}|(\d\d?|[\s\S]))/g,h=/([\s\S])(?=[\s\S]*\1)/g,nt=/^(?:[?*+]|{\d+(?:,\d*)?})\??/,ft=i.exec.call(/()??/,"")[1]===n,l=RegExp.prototype.sticky!==n,y=!1,w="gim"+(l?"y":"");return t=function(r,u){if(t.isRegExp(r)){if(u!==n)throw new TypeError("can't supply flags when constructing one RegExp from another");return o(r)}if(y)throw new Error("can't call the XRegExp constructor within token definition functions");var l=[],a=e,b={hasNamedCapture:!1,captureNames:[],hasFlag:function(n){return u.indexOf(n)>-1}},f=0,c,s,p;if(r=r===n?"":String(r),u=u===n?"":String(u),i.match.call(u,h))throw new SyntaxError("invalid duplicate regular expression flag");for(r=i.replace.call(r,/^\(\?([\w$]+)\)/,function(n,t){if(i.test.call(/[gy]/,t))throw new SyntaxError("can't use flag g or y in mode modifier");return u=i.replace.call(u+t,h,""),""}),t.forEach(u,/[\s\S]/,function(n){if(w.indexOf(n[0])<0)throw new SyntaxError("invalid regular expression flag "+n[0]);});f<r.length;)c=ut(r,f,a,b),c?(l.push(c.output),f+=c.match[0].length||1):(s=i.exec.call(it[a],r.slice(f)),s?(l.push(s[0]),f+=s[0].length):(p=r.charAt(f),p==="["?a=rt:p==="]"&&(a=e),l.push(p),++f));return v(new RegExp(l.join(""),i.replace.call(u,/[^gimy]+/g,"")),b.hasNamedCapture?b.captureNames:null)},c={on:function(n,t,r){r=r||{},n&&p.push({pattern:o(n,"g"+(l?"y":"")),handler:t,scope:r.scope||e,trigger:r.trigger||null}),r.customFlags&&(w=i.replace.call(w+r.customFlags,h,""))},off:function(){throw new Error("extensibility must be installed before using addToken");}},t.addToken=c.off,t.cache=function(n,i){var r=n+"/"+(i||"");return k[r]||(k[r]=t(n,i))},t.escape=function(n){return i.replace.call(n,/[-[\]{}()*+?.,\\^$|#\s]/g,"\\$&")},t.exec=function(n,t,i,u){var e=o(t,"g"+(u&&l?"y":""),u===!1?"y":""),f;return e.lastIndex=i=i||0,f=r.exec.call(e,n),u&&f&&f.index!==i&&(f=null),t.global&&(t.lastIndex=f?e.lastIndex:0),f},t.forEach=function(n,i,r,u){for(var e=0,o=-1,f;f=t.exec(n,i,e);)r.call(u,f,++o,n,i),e=f.index+(f[0].length||1);return u},t.globalize=function(n){return o(n,"g")},t.install=function(n){n=d(n),!f.natives&&n.natives&&tt(!0),!f.extensibility&&n.extensibility&&b(!0)},t.isInstalled=function(n){return!!f[n]},t.isRegExp=function(n){return s(n,"regexp")},t.matchChain=function(n,i){return function r(n,u){for(var o=i[u].regex?i[u]:{regex:i[u]},f=[],s=function(n){f.push(o.backref?n[o.backref]||"":n[0])},e=0;e<n.length;++e)t.forEach(n[e],o.regex,s);return u===i.length-1||!f.length?f:r(f,u+1)}([n],0)},t.replace=function(i,u,f,e){var c=t.isRegExp(u),s=u,h;return c?(e===n&&u.global&&(e="all"),s=o(u,e==="all"?"g":"",e==="all"?"":"g")):e==="all"&&(s=new RegExp(t.escape(String(u)),"g")),h=r.replace.call(String(i),s,f),c&&u.global&&(u.lastIndex=0),h},t.split=function(n,t,i){return r.split.call(n,t,i)},t.test=function(n,i,r,u){return!!t.exec(n,i,r,u)},t.uninstall=function(n){n=d(n),f.natives&&n.natives&&tt(!1),f.extensibility&&n.extensibility&&b(!1)},t.union=function(n,i){var l=/(\()(?!\?)|\\([1-9]\d*)|\\[\s\S]|\[(?:[^\\\]]|\\[\s\S])*]/g,o=0,f,h,c=function(n,t,i){var r=h[o-f];if(t){if(++o,r)return"(?<"+r+">"}else if(i)return"\\"+(+i+f);return n},e=[],r,u;if(!(s(n,"array")&&n.length))throw new TypeError("patterns must be a nonempty array");for(u=0;u<n.length;++u)r=n[u],t.isRegExp(r)?(f=o,h=r.xregexp&&r.xregexp.captureNames||[],e.push(t(r.source).source.replace(l,c))):e.push(t.escape(r));return t(e.join("|"),i)},t.version="2.0.0",r.exec=function(t){var r,f,e,o,u;if(this.global||(o=this.lastIndex),r=i.exec.apply(this,arguments),r){if(!ft&&r.length>1&&a(r,"")>-1&&(e=new RegExp(this.source,i.replace.call(g(this),"g","")),i.replace.call(String(t).slice(r.index),e,function(){for(var t=1;t<arguments.length-2;++t)arguments[t]===n&&(r[t]=n)})),this.xregexp&&this.xregexp.captureNames)for(u=1;u<r.length;++u)f=this.xregexp.captureNames[u-1],f&&(r[f]=r[u]);this.global&&!r[0].length&&this.lastIndex>r.index&&(this.lastIndex=r.index)}return this.global||(this.lastIndex=o),r},r.test=function(n){return!!r.exec.call(this,n)},r.match=function(n){if(t.isRegExp(n)){if(n.global){var u=i.match.apply(this,arguments);return n.lastIndex=0,u}}else n=new RegExp(n);return r.exec.call(n,this)},r.replace=function(n,r){var e=t.isRegExp(n),u,f,h,o;return e?(n.xregexp&&(u=n.xregexp.captureNames),n.global||(o=n.lastIndex)):n+="",s(r,"function")?f=i.replace.call(String(this),n,function(){var t=arguments,i;if(u)for(t[0]=new String(t[0]),i=0;i<u.length;++i)u[i]&&(t[0][u[i]]=t[i+1]);return e&&n.global&&(n.lastIndex=t[t.length-2]+t[0].length),r.apply(null,t)}):(h=String(this),f=i.replace.call(h,n,function(){var n=arguments;return i.replace.call(String(r),et,function(t,i,r){var f;if(i){if(f=+i,f<=n.length-3)return n[f]||"";if(f=u?a(u,i):-1,f<0)throw new SyntaxError("backreference to undefined group "+t);return n[f+1]||""}if(r==="$")return"$";if(r==="&"||+r==0)return n[0];if(r==="`")return n[n.length-1].slice(0,n[n.length-2]);if(r==="'")return n[n.length-1].slice(n[n.length-2]+n[0].length);if(r=+r,!isNaN(r)){if(r>n.length-3)throw new SyntaxError("backreference to undefined group "+t);return n[r]||""}throw new SyntaxError("invalid token "+t);})})),e&&(n.lastIndex=n.global?0:o),f},r.split=function(r,u){if(!t.isRegExp(r))return i.split.apply(this,arguments);var e=String(this),h=r.lastIndex,f=[],o=0,s;return u=(u===n?-1:u)>>>0,t.forEach(e,r,function(n){n.index+n[0].length>o&&(f.push(e.slice(o,n.index)),n.length>1&&n.index<e.length&&Array.prototype.push.apply(f,n.slice(1)),s=n[0].length,o=n.index+s)}),o===e.length?(!i.test.call(r,"")||s)&&f.push(""):f.push(e.slice(o)),r.lastIndex=h,f.length>u?f.slice(0,u):f},u=c.on,u(/\\([ABCE-RTUVXYZaeg-mopqyz]|c(?![A-Za-z])|u(?![\dA-Fa-f]{4})|x(?![\dA-Fa-f]{2}))/,function(n,t){if(n[1]==="B"&&t===e)return n[0];throw new SyntaxError("invalid escape "+n[0]);},{scope:"all"}),u(/\[(\^?)]/,function(n){return n[1]?"[\\s\\S]":"\\b\\B"}),u(/(?:\(\?#[^)]*\))+/,function(n){return i.test.call(nt,n.input.slice(n.index+n[0].length))?"":"(?:)"}),u(/\\k<([\w$]+)>/,function(n){var t=isNaN(n[1])?a(this.captureNames,n[1])+1:+n[1],i=n.index+n[0].length;if(!t||t>this.captureNames.length)throw new SyntaxError("backreference to undefined group "+n[0]);return"\\"+t+(i===n.input.length||isNaN(n.input.charAt(i))?"":"(?:)")}),u(/(?:\s+|#.*)+/,function(n){return i.test.call(nt,n.input.slice(n.index+n[0].length))?"":"(?:)"},{trigger:function(){return this.hasFlag("x")},customFlags:"x"}),u(/\./,function(){return"[\\s\\S]"},{trigger:function(){return this.hasFlag("s")},customFlags:"s"}),u(/\(\?P?<([\w$]+)>/,function(n){if(!isNaN(n[1]))throw new SyntaxError("can't use integer as capture name "+n[0]);return this.captureNames.push(n[1]),this.hasNamedCapture=!0,"("}),u(/\\(\d+)/,function(n,t){if(!(t===e&&/^[1-9]/.test(n[1])&&+n[1]<=this.captureNames.length)&&n[1]!=="0")throw new SyntaxError("can't use octal escape or backreference to undefined group "+n[0]);return n[0]},{scope:"all"}),u(/\((?!\?)/,function(){return this.hasFlag("n")?"(?:":(this.captureNames.push(null),"(")},{customFlags:"n"}),typeof exports!="undefined"&&(exports.XRegExp=t),t}()


/*!
 * SyntaxHighlighter by Alex Gorbatchev
 * https://github.com/alexgorbatchev/SyntaxHighlighter - MIT license
 */

//
// Begin anonymous function. This is used to contain local scope variables without polutting global scope.
//
if (typeof(SyntaxHighlighter) == 'undefined') var SyntaxHighlighter = function() {

// CommonJS
if (typeof(require) != 'undefined' && typeof(XRegExp) == 'undefined')
{
    XRegExp = require('xregexp').XRegExp;
}

// Shortcut object which will be assigned to the SyntaxHighlighter variable.
// This is a shorthand for local reference in order to avoid long namespace
// references to SyntaxHighlighter.whatever...
var sh = {
    defaults : {
        /** Additional CSS class names to be added to highlighter elements. */
        'class-name' : '',

        /** First line number. */
        'first-line' : 1,

        /**
         * Pads line numbers. Possible values are:
         *
         *   false - don't pad line numbers.
         *   true  - automaticaly pad numbers with minimum required number of leading zeroes.
         *   [int] - length up to which pad line numbers.
         */
        'pad-line-numbers' : false,

        /** Lines to highlight. */
        'highlight' : null,

        /** Title to be displayed above the code block. */
        'title' : null,

        /** Enables or disables smart tabs. */
        'smart-tabs' : true,

        /** Gets or sets tab size. */
        'tab-size' : 4,

        /** Enables or disables gutter. */
        'gutter' : true,

        /** Enables or disables toolbar. */
        'toolbar' : true,

        /** Enables quick code copy and paste from double click. */
        'quick-code' : true,

        /** Forces code view to be collapsed. */
        'collapse' : false,

        /** Enables or disables automatic links. */
        'auto-links' : true,

        /** Gets or sets light mode. Equavalent to turning off gutter and toolbar. */
        'light' : false,

        'unindent' : true,

        'html-script' : false
    },

    config : {
        space : '&nbsp;',

        /** Enables use of <SCRIPT type="syntaxhighlighter" /> tags. */
        useScriptTags : true,

        /** Blogger mode flag. */
        bloggerMode : false,

        stripBrs : false,

        /** Name of the tag that SyntaxHighlighter will automatically look for. */
        tagName : 'pre',

        strings : {
            expandSource : 'expand source',
            help : '?',
            alert: 'SyntaxHighlighter\n\n',
            noBrush : 'Can\'t find brush for: ',
            brushNotHtmlScript : 'Brush wasn\'t configured for html-script option: ',

            // this is populated by the build script
            aboutDialog : ''
        }
    },

    /** Internal 'global' variables. */
    vars : {
        discoveredBrushes : null,
        highlighters : {}
    },

    /** This object is populated by user included external brush files. */
    brushes : {},

    /** Common regular expressions. */
    regexLib : {
        multiLineCComments          : XRegExp('/\\*.*?\\*/', 'gs'),
        singleLineCComments         : /\/\/.*$/gm,
        singleLinePerlComments      : /#.*$/gm,
        doubleQuotedString          : /"([^\\"\n]|\\.)*"/g,
        singleQuotedString          : /'([^\\'\n]|\\.)*'/g,
        multiLineDoubleQuotedString : XRegExp('"([^\\\\"]|\\\\.)*"', 'gs'),
        multiLineSingleQuotedString : XRegExp("'([^\\\\']|\\\\.)*'", 'gs'),
        xmlComments                 : XRegExp('(&lt;|<)!--.*?--(&gt;|>)', 'gs'),
        url                         : /\w+:\/\/[\w-.\/?%&=:@;#]*/g,
        phpScriptTags               : { left: /(&lt;|<)\?(?:=|php)?/g, right: /\?(&gt;|>)/g, 'eof' : true },
        aspScriptTags               : { left: /(&lt;|<)%=?/g, right: /%(&gt;|>)/g },
        scriptScriptTags            : { left: /(&lt;|<)\s*script.*?(&gt;|>)/gi, right: /(&lt;|<)\/\s*script\s*(&gt;|>)/gi }
    },

    toolbar: {
        /**
         * Generates HTML markup for the toolbar.
         * @param {Highlighter} highlighter Highlighter instance.
         * @return {String} Returns HTML markup.
         */
        getHtml: function(highlighter)
        {
            var html = '<div class="toolbar">',
                items = sh.toolbar.items,
                list = items.list
                ;

            function defaultGetHtml(highlighter, name)
            {
                return sh.toolbar.getButtonHtml(highlighter, name, sh.config.strings[name]);
            }

            for (var i = 0, l = list.length; i < l; i++)
            {
                html += (items[list[i]].getHtml || defaultGetHtml)(highlighter, list[i]);
            }

            html += '</div>';

            return html;
        },

        /**
         * Generates HTML markup for a regular button in the toolbar.
         * @param {Highlighter} highlighter Highlighter instance.
         * @param {String} commandName      Command name that would be executed.
         * @param {String} label            Label text to display.
         * @return {String}                 Returns HTML markup.
         */
        getButtonHtml: function(highlighter, commandName, label)
        {
            return '<span><a href="#" class="toolbar_item'
                + ' command_' + commandName
                + ' ' + commandName
                + '">' + label + '</a></span>'
                ;
        },

        /**
         * Event handler for a toolbar anchor.
         */
        handler: function(e)
        {
            var target = e.target,
                className = target.className || ''
                ;

            function getValue(name)
            {
                var r = new RegExp(name + '_(\\w+)'),
                    match = r.exec(className)
                    ;

                return match ? match[1] : null;
            }

            var highlighter = getHighlighterById(findParentElement(target, '.syntaxhighlighter').id),
                commandName = getValue('command')
                ;

            // execute the toolbar command
            if (highlighter && commandName && sh.toolbar.items[commandName].execute)
                sh.toolbar.items[commandName].execute(highlighter);

            // disable default A click behaviour
            e.preventDefault();
        },

        /** Collection of toolbar items. */
        items : {
            // Ordered lis of items in the toolbar. Can't expect `for (var n in items)` to be consistent.
            list: ['expandSource', 'language'],

            expandSource: {
                getHtml: function(highlighter)
                {
                    if (highlighter.getParam('collapse') != true)
                        return '';

                    var title = highlighter.getParam('title');
                    return sh.toolbar.getButtonHtml(highlighter, 'expandSource', title ? title : sh.config.strings.expandSource);
                },

                execute: function(highlighter)
                {
                    var div = getHighlighterDivById(highlighter.id);
                    removeClass(div, 'collapsed');
                }
            },

            /** Command to display the about dialog window. */
            help: {
                execute: function(highlighter)
                {
                    var wnd = popup('', '_blank', 500, 250, 'scrollbars=0'),
                        doc = wnd.document
                        ;

                    doc.write(sh.config.strings.aboutDialog);
                    doc.close();
                    wnd.focus();
                }
            },

            language: {
                getHtml: function (highlighter) {
                    return highlighter.langLabel ?
                        sh.toolbar.getButtonHtml(highlighter, 'lang', highlighter.langLabel) :
                        '';
                }
            }
        }
    },

    /**
     * Finds all elements on the page which should be processes by SyntaxHighlighter.
     *
     * @param {Object} globalParams     Optional parameters which override element's
     *                                  parameters. Only used if element is specified.
     *
     * @param {Object} element  Optional element to highlight. If none is
     *                          provided, all elements in the current document
     *                          are returned which qualify.
     *
     * @return {Array}  Returns list of <code>{ target: DOMElement, params: Object }</code> objects.
     */
    findElements: function(globalParams, element)
    {
        var elements = element ? [element] : toArray(document.getElementsByTagName(sh.config.tagName)),
            conf = sh.config,
            result = []
            ;

        // support for <SCRIPT TYPE="syntaxhighlighter" /> feature
        if (conf.useScriptTags)
            elements = elements.concat(getSyntaxHighlighterScriptTags());

        if (elements.length === 0)
            return result;

        for (var i = 0, l = elements.length; i < l; i++)
        {
            var item = {
                target: elements[i],
                // local params take precedence over globals
                params: merge(globalParams, parseParams(elements[i].className))
            };

            if (item.params['brush'] == null)
                continue;

            result.push(item);
        }

        return result;
    },

    /**
     * Shorthand to highlight all elements on the page that are marked as
     * SyntaxHighlighter source code.
     *
     * @param {Object} globalParams     Optional parameters which override element's
     *                                  parameters. Only used if element is specified.
     *
     * @param {Object} element  Optional element to highlight. If none is
     *                          provided, all elements in the current document
     *                          are highlighted.
     */
    highlight: function(globalParams, element)
    {
        // Don't run the syntax highlighter on IE6/7 as it absolutely kills
        // performance
        var userAgent = navigator.appVersion;
        if (userAgent.indexOf("MSIE 7.") !== -1 || userAgent.indexOf("MSIE 6.") !== -1) {
            return;
        }

        var elements = this.findElements(globalParams, element),
            propertyName = 'innerHTML',
            highlighter = null,
            conf = sh.config
            ;

        if (elements.length === 0)
            return;

        for (var i = 0, l = elements.length; i < l; i++)
        {
            var element = elements[i],
                target = element.target,
                params = element.params,
                brushName = params.brush,
                code
                ;

            if (brushName == null)
                continue;

            // Instantiate a brush
            if (params['html-script'] == 'true' || sh.defaults['html-script'] == true)
            {
                highlighter = new sh.HtmlScript(brushName);
                brushName = 'htmlscript';
            }
            else
            {
                var brush = findBrush(brushName);

                if (brush)
                    highlighter = new brush();
                else
                    continue;
            }

            code = target[propertyName];

            // remove CDATA from <SCRIPT/> tags if it's present
            if (conf.useScriptTags)
                code = stripCData(code);

            // Inject title if the attribute is present
            if ((target.title || '') != '')
                params.title = target.title;

            params['brush'] = brushName;
            highlighter.init(params);
            element = highlighter.getDiv(code);

            // carry over ID
            if ((target.id || '') != '')
                element.id = target.id;

            target.parentNode.replaceChild(element, target);
        }
    },

    /**
     * Main entry point for the SyntaxHighlighter.
     * @param {Object} params Optional params to apply to all highlighted elements.
     */
    all: function(params)
    {
        attachEvent(
            window,
            'load',
            function() { sh.highlight(params); }
        );
    }
}; // end of sh

/**
 * Checks if target DOM elements has specified CSS class.
 * @param {DOMElement} target Target DOM element to check.
 * @param {String} className Name of the CSS class to check for.
 * @return {Boolean} Returns true if class name is present, false otherwise.
 */
function hasClass(target, className)
{
    return target.className.indexOf(className) != -1;
};

/**
 * Adds CSS class name to the target DOM element.
 * @param {DOMElement} target Target DOM element.
 * @param {String} className New CSS class to add.
 */
function addClass(target, className)
{
    if (!hasClass(target, className))
        target.className += ' ' + className;
};

/**
 * Removes CSS class name from the target DOM element.
 * @param {DOMElement} target Target DOM element.
 * @param {String} className CSS class to remove.
 */
function removeClass(target, className)
{
    target.className = target.className.replace(className, '');
};

/**
 * Converts the source to array object. Mostly used for function arguments and
 * lists returned by getElementsByTagName() which aren't Array objects.
 * @param {List} source Source list.
 * @return {Array} Returns array.
 */
function toArray(source)
{
    var result = [];

    for (var i = 0, l = source.length; i < l; i++)
        result.push(source[i]);

    return result;
};

/**
 * Splits block of text into lines.
 * @param {String} block Block of text.
 * @return {Array} Returns array of lines.
 */
function splitLines(block)
{
    return block.split(/\r?\n/);
}

/**
 * Generates HTML ID for the highlighter.
 * @param {String} highlighterId Highlighter ID.
 * @return {String} Returns HTML ID.
 */
function getHighlighterId(id)
{
    var prefix = 'highlighter_';
    return id.indexOf(prefix) == 0 ? id : prefix + id;
};

/**
 * Finds Highlighter instance by ID.
 * @param {String} highlighterId Highlighter ID.
 * @return {Highlighter} Returns instance of the highlighter.
 */
function getHighlighterById(id)
{
    return sh.vars.highlighters[getHighlighterId(id)];
};

/**
 * Finds highlighter's DIV container.
 * @param {String} highlighterId Highlighter ID.
 * @return {Element} Returns highlighter's DIV element.
 */
function getHighlighterDivById(id)
{
    return document.getElementById(getHighlighterId(id));
};

/**
 * Stores highlighter so that getHighlighterById() can do its thing. Each
 * highlighter must call this method to preserve itself.
 * @param {Highilghter} highlighter Highlighter instance.
 */
function storeHighlighter(highlighter)
{
    sh.vars.highlighters[getHighlighterId(highlighter.id)] = highlighter;
};

/**
 * Looks for a child or parent node which has specified classname.
 * Equivalent to jQuery's $(container).find(".className")
 * @param {Element} target Target element.
 * @param {String} search Class name or node name to look for.
 * @param {Boolean} reverse If set to true, will go up the node tree instead of down.
 * @return {Element} Returns found child or parent element on null.
 */
function findElement(target, search, reverse /* optional */)
{
    if (target == null)
        return null;

    var nodes           = reverse != true ? target.childNodes : [ target.parentNode ],
        propertyToFind  = { '#' : 'id', '.' : 'className' }[search.substr(0, 1)] || 'nodeName',
        expectedValue,
        found
        ;

    expectedValue = propertyToFind != 'nodeName'
        ? search.substr(1)
        : search.toUpperCase()
        ;

    // main return of the found node
    if ((target[propertyToFind] || '').indexOf(expectedValue) != -1)
        return target;

    for (var i = 0, l = nodes.length; nodes && i < l && found == null; i++)
        found = findElement(nodes[i], search, reverse);

    return found;
};

/**
 * Looks for a parent node which has specified classname.
 * This is an alias to <code>findElement(container, className, true)</code>.
 * @param {Element} target Target element.
 * @param {String} className Class name to look for.
 * @return {Element} Returns found parent element on null.
 */
function findParentElement(target, className)
{
    return findElement(target, className, true);
};

/**
 * Finds an index of element in the array.
 * @ignore
 * @param {Object} searchElement
 * @param {Number} fromIndex
 * @return {Number} Returns index of element if found; -1 otherwise.
 */
function indexOf(array, searchElement, fromIndex)
{
    fromIndex = Math.max(fromIndex || 0, 0);

    for (var i = fromIndex, l = array.length; i < l; i++)
        if(array[i] == searchElement)
            return i;

    return -1;
};

/**
 * Generates a unique element ID.
 */
function guid(prefix)
{
    return (prefix || '') + Math.round(Math.random() * 1000000).toString();
};

/**
 * Merges two objects. Values from obj2 override values in obj1.
 * Function is NOT recursive and works only for one dimensional objects.
 * @param {Object} obj1 First object.
 * @param {Object} obj2 Second object.
 * @return {Object} Returns combination of both objects.
 */
function merge(obj1, obj2)
{
    var result = {}, name;

    for (name in obj1)
        result[name] = obj1[name];

    for (name in obj2)
        result[name] = obj2[name];

    return result;
};

/**
 * Attempts to convert string to boolean.
 * @param {String} value Input string.
 * @return {Boolean} Returns true if input was "true", false if input was "false" and value otherwise.
 */
function toBoolean(value)
{
    var result = { "true" : true, "false" : false }[value];
    return result == null ? value : result;
};

/**
 * Opens up a centered popup window.
 * @param {String} url      URL to open in the window.
 * @param {String} name     Popup name.
 * @param {int} width       Popup width.
 * @param {int} height      Popup height.
 * @param {String} options  window.open() options.
 * @return {Window}         Returns window instance.
 */
function popup(url, name, width, height, options)
{
    var x = (screen.width - width) / 2,
        y = (screen.height - height) / 2
        ;

    options +=  ', left=' + x +
                ', top=' + y +
                ', width=' + width +
                ', height=' + height
        ;
    options = options.replace(/^,/, '');

    var win = window.open(url, name, options);
    win.focus();
    return win;
};

/**
 * Adds event handler to the target object.
 * @param {Object} obj      Target object.
 * @param {String} type     Name of the event.
 * @param {Function} func   Handling function.
 */
function attachEvent(obj, type, func, scope)
{
    function handler(e)
    {
        e = e || window.event;

        if (!e.target)
        {
            e.target = e.srcElement;
            e.preventDefault = function()
            {
                this.returnValue = false;
            };
        }

        func.call(scope || window, e);
    };

    if (obj.attachEvent)
    {
        obj.attachEvent('on' + type, handler);
    }
    else
    {
        obj.addEventListener(type, handler, false);
    }
};

/**
 * Displays an alert.
 * @param {String} str String to display.
 */
function alert(str)
{
    window.alert(sh.config.strings.alert + str);
};

/**
 * Finds a brush by its alias.
 *
 * @param {String} alias        Brush alias.
 * @param {Boolean} showAlert   Suppresses the alert if false.
 * @return {Brush}              Returns bursh constructor if found, null otherwise.
 */
function findBrush(alias, showAlert)
{
    var brushes = sh.vars.discoveredBrushes,
        result = null
        ;

    if (brushes == null)
    {
        brushes = {};

        // Find all brushes
        for (var brush in sh.brushes)
        {
            var info = sh.brushes[brush],
                aliases = info.aliases
                ;

            if (aliases == null)
                continue;

            // keep the brush name
            info.brushName = brush.toLowerCase();

            for (var i = 0, l = aliases.length; i < l; i++)
                brushes[aliases[i]] = brush;
        }

        sh.vars.discoveredBrushes = brushes;
    }

    result = sh.brushes[brushes[alias]];

    if (result == null && showAlert)
        alert(sh.config.strings.noBrush + alias);

    return result;
};

/**
 * Executes a callback on each line and replaces each line with result from the callback.
 * @param {Object} str          Input string.
 * @param {Object} callback     Callback function taking one string argument and returning a string.
 */
function eachLine(str, callback)
{
    var lines = splitLines(str);

    for (var i = 0, l = lines.length; i < l; i++)
        lines[i] = callback(lines[i], i);

    // include \r to enable copy-paste on windows (ie8) without getting everything on one line
    return lines.join('\r\n');
};

/**
 * This is a special trim which only removes first and last empty lines
 * and doesn't affect valid leading space on the first line.
 *
 * @param {String} str   Input string
 * @return {String}      Returns string without empty first and last lines.
 */
function trimFirstAndLastLines(str)
{
    return str.replace(/^[ ]*[\n]+|[\n]*[ ]*$/g, '');
};

/**
 * Parses key/value pairs into hash object.
 *
 * Understands the following formats:
 * - name: word;
 * - name: [word, word];
 * - name: "string";
 * - name: 'string';
 *
 * For example:
 *   name1: value; name2: [value, value]; name3: 'value'
 *
 * @param {String} str    Input string.
 * @return {Object}       Returns deserialized object.
 */
function parseParams(str)
{
    var match,
        result = {},
        arrayRegex = XRegExp("^\\[(?<values>(.*?))\\]$"),
        pos = 0,
        regex = XRegExp(
            "(?<name>[\\w-]+)" +
            "\\s*:\\s*" +
            "(?<value>" +
                "[\\w%#-]+|" +      // word
                "\\[.*?\\]|" +      // [] array
                '".*?"|' +          // "" string
                "'.*?'" +           // '' string
            ")\\s*;?",
            "g"
        )
        ;

    while ((match = XRegExp.exec(str, regex, pos)) != null)
    {
        var value = match.value
            .replace(/^['"]|['"]$/g, '') // strip quotes from end of strings
            ;

        // try to parse array value
        if (value != null && arrayRegex.test(value))
        {
            var m = XRegExp.exec(value, arrayRegex);
            value = m.values.length > 0 ? m.values.split(/\s*,\s*/) : [];
        }

        result[match.name] = value;
        pos = match.index + match[0].length;
    }

    // AJJ - markdown style language option
    var a = str.match(/language-(.*)/);
    if ( a ) {
        result['brush'] = a[1];
    }
    else if ( str && str.indexOf('multiline') !== -1 ) {
        // Markdown code block without a language identifier
        result['brush'] = 'text';
    }

    return result;
};

/**
 * Wraps each line of the string into <code/> tag with given style applied to it.
 *
 * @param {String} str   Input string.
 * @param {String} css   Style name to apply to the string.
 * @return {String}      Returns input string with each line surrounded by <span/> tag.
 */
function wrapLinesWithCode(str, css)
{
    if (str == null || str.length == 0 || str == '\n')
        return str;

    str = str.replace(/</g, '&lt;');

    // Replace two or more sequential spaces with &nbsp; leaving last space untouched.
    str = str.replace(/ {2,}/g, function(m)
    {
        var spaces = '';

        for (var i = 0, l = m.length; i < l - 1; i++)
            spaces += sh.config.space;

        return spaces + ' ';
    });

    // Split each line and apply <span class="...">...</span> to them so that
    // leading spaces aren't included.
    if (css != null)
        str = eachLine(str, function(line)
        {
            if (line.length == 0)
                return '';

            var spaces = '';

            line = line.replace(/^(&nbsp;| )+/, function(s)
            {
                spaces = s;
                return '';
            });

            if (line.length == 0)
                return spaces;

            return spaces + '<code class="' + css + '">' + line + '</code>';
        });

    return str;
};

/**
 * Pads number with zeros until it's length is the same as given length.
 *
 * @param {Number} number   Number to pad.
 * @param {Number} length   Max string length with.
 * @return {String}         Returns a string padded with proper amount of '0'.
 */
function padNumber(number, length)
{
    var result = number.toString();

    while (result.length < length)
        result = '0' + result;

    return result;
};

/**
 * Replaces tabs with spaces.
 *
 * @param {String} code     Source code.
 * @param {Number} tabSize  Size of the tab.
 * @return {String}         Returns code with all tabs replaces by spaces.
 */
function processTabs(code, tabSize)
{
    var tab = '';

    for (var i = 0; i < tabSize; i++)
        tab += ' ';

    return code.replace(/\t/g, tab);
};

/**
 * Replaces tabs with smart spaces.
 *
 * @param {String} code    Code to fix the tabs in.
 * @param {Number} tabSize Number of spaces in a column.
 * @return {String}        Returns code with all tabs replaces with roper amount of spaces.
 */
function processSmartTabs(code, tabSize)
{
    var lines = splitLines(code),
        tab = '\t',
        spaces = ''
        ;

    // Create a string with 1000 spaces to copy spaces from...
    // It's assumed that there would be no indentation longer than that.
    for (var i = 0; i < 50; i++)
        spaces += '                    '; // 20 spaces * 50

    // This function inserts specified amount of spaces in the string
    // where a tab is while removing that given tab.
    function insertSpaces(line, pos, count)
    {
        return line.substr(0, pos)
            + spaces.substr(0, count)
            + line.substr(pos + 1, line.length) // pos + 1 will get rid of the tab
            ;
    };

    // Go through all the lines and do the 'smart tabs' magic.
    code = eachLine(code, function(line)
    {
        if (line.indexOf(tab) == -1)
            return line;

        var pos = 0;

        while ((pos = line.indexOf(tab)) != -1)
        {
            // This is pretty much all there is to the 'smart tabs' logic.
            // Based on the position within the line and size of a tab,
            // calculate the amount of spaces we need to insert.
            var spaces = tabSize - pos % tabSize;
            line = insertSpaces(line, pos, spaces);
        }

        return line;
    });

    return code;
};

/**
 * Performs various string fixes based on configuration.
 */
function fixInputString(str)
{
    var br = /<br\s*\/?>|&lt;br\s*\/?&gt;/gi;

    if (sh.config.bloggerMode == true)
        str = str.replace(br, '\n');

    if (sh.config.stripBrs == true)
        str = str.replace(br, '');

    return str;
};

/**
 * Removes all white space at the begining and end of a string.
 *
 * @param {String} str   String to trim.
 * @return {String}      Returns string without leading and following white space characters.
 */
function trim(str)
{
    return str.replace(/^\s+|\s+$/g, '');
};

/**
 * Unindents a block of text by the lowest common indent amount.
 * @param {String} str   Text to unindent.
 * @return {String}      Returns unindented text block.
 */
function unindent(str)
{
    var lines = splitLines(fixInputString(str)),
        indents = new Array(),
        regex = /^\s*/,
        min = 1000
        ;

    // go through every line and check for common number of indents
    for (var i = 0, l = lines.length; i < l && min > 0; i++)
    {
        var line = lines[i];

        if (trim(line).length == 0)
            continue;

        var matches = regex.exec(line);

        // In the event that just one line doesn't have leading white space
        // we can't unindent anything, so bail completely.
        if (matches == null)
            return str;

        min = Math.min(matches[0].length, min);
    }

    // trim minimum common number of white space from the begining of every line
    if (min > 0)
        for (var i = 0, l = lines.length; i < l; i++)
            lines[i] = lines[i].substr(min);

    return lines.join('\n');
};

/**
 * Callback method for Array.sort() which sorts matches by
 * index position and then by length.
 *
 * @param {Match} m1    Left object.
 * @param {Match} m2    Right object.
 * @return {Number}     Returns -1, 0 or -1 as a comparison result.
 */
function matchesSortCallback(m1, m2)
{
    // sort matches by index first
    if(m1.index < m2.index)
        return -1;
    else if(m1.index > m2.index)
        return 1;
    else
    {
        // if index is the same, sort by length
        if(m1.length < m2.length)
            return -1;
        else if(m1.length > m2.length)
            return 1;
    }

    return 0;
};

/**
 * Executes given regular expression on provided code and returns all
 * matches that are found.
 *
 * @param {String} code    Code to execute regular expression on.
 * @param {Object} regex   Regular expression item info from <code>regexList</code> collection.
 * @return {Array}         Returns a list of Match objects.
 */
function getMatches(code, regexInfo)
{
    function defaultAdd(match, regexInfo)
    {
        return match[0];
    };

    var index = 0,
        match = null,
        matches = [],
        func = regexInfo.func ? regexInfo.func : defaultAdd
        pos = 0
        ;

    while((match = XRegExp.exec(code, regexInfo.regex, pos)) != null)
    {
        var resultMatch = func(match, regexInfo);

        if (typeof(resultMatch) == 'string')
            resultMatch = [new sh.Match(resultMatch, match.index, regexInfo.css)];

        matches = matches.concat(resultMatch);
        pos = match.index + match[0].length;
    }

    return matches;
};

/**
 * Turns all URLs in the code into <a/> tags.
 * @param {String} code Input code.
 * @return {String} Returns code with </a> tags.
 */
function processUrls(code)
{
    var gt = /(.*)((&gt;|&lt;).*)/;

    return code.replace(sh.regexLib.url, function(m)
    {
        var suffix = '',
            match = null
            ;

        // We include &lt; and &gt; in the URL for the common cases like <http://google.com>
        // The problem is that they get transformed into &lt;http://google.com&gt;
        // Where as &gt; easily looks like part of the URL string.

        if (match = gt.exec(m))
        {
            m = match[1];
            suffix = match[2];
        }

        return '<a href="' + m + '">' + m + '</a>' + suffix;
    });
};

/**
 * Finds all <SCRIPT TYPE="syntaxhighlighter" /> elementss.
 * @return {Array} Returns array of all found SyntaxHighlighter tags.
 */
function getSyntaxHighlighterScriptTags()
{
    var tags = document.getElementsByTagName('script'),
        result = []
        ;

    for (var i = 0, l = tags.length; i < l; i++)
        if (tags[i].type == 'syntaxhighlighter')
            result.push(tags[i]);

    return result;
};

/**
 * Strips <![CDATA[]]> from <SCRIPT /> content because it should be used
 * there in most cases for XHTML compliance.
 * @param {String} original Input code.
 * @return {String} Returns code without leading <![CDATA[]]> tags.
 */
function stripCData(original)
{
    var left = '<![CDATA[',
        right = ']]>',
        // for some reason IE inserts some leading blanks here
        copy = trim(original),
        changed = false,
        leftLength = left.length,
        rightLength = right.length
        ;

    if (copy.indexOf(left) == 0)
    {
        copy = copy.substring(leftLength);
        changed = true;
    }

    var copyLength = copy.length;

    if (copy.indexOf(right) == copyLength - rightLength)
    {
        copy = copy.substring(0, copyLength - rightLength);
        changed = true;
    }

    return changed ? copy : original;
};


/**
 * Quick code mouse double click handler.
 */
function quickCodeHandler(e)
{
    var target = e.target,
        highlighterDiv = findParentElement(target, '.syntaxhighlighter'),
        container = findParentElement(target, '.container'),
        textarea = document.createElement('textarea'),
        highlighter
        ;

    if (!container || !highlighterDiv || findElement(container, 'textarea'))
        return;

    highlighter = getHighlighterById(highlighterDiv.id);

    // add source class name
    addClass(highlighterDiv, 'source');

    // Have to go over each line and grab it's text, can't just do it on the
    // container because Firefox loses all \n where as Webkit doesn't.
    var lines = container.childNodes,
        code = []
        ;

    for (var i = 0, l = lines.length; i < l; i++)
        code.push(lines[i].innerText || lines[i].textContent);

    // using \r instead of \r or \r\n makes this work equally well on IE, FF and Webkit
    code = code.join('\r');

    // For Webkit browsers, replace nbsp with a breaking space
    code = code.replace(/\u00a0/g, " ");

    // inject <textarea/> tag
    textarea.appendChild(document.createTextNode(code));
    container.appendChild(textarea);

    // preselect all text
    textarea.focus();
    textarea.select();

    // set up handler for lost focus
    attachEvent(textarea, 'blur', function(e)
    {
        textarea.parentNode.removeChild(textarea);
        removeClass(highlighterDiv, 'source');
    });
};

/**
 * Match object.
 */
sh.Match = function(value, index, css)
{
    this.value = value;
    this.index = index;
    this.length = value.length;
    this.css = css;
    this.brushName = null;
};

sh.Match.prototype.toString = function()
{
    return this.value;
};

/**
 * Simulates HTML code with a scripting language embedded.
 *
 * @param {String} scriptBrushName Brush name of the scripting language.
 */
sh.HtmlScript = function(scriptBrushName)
{
    var brushClass = findBrush(scriptBrushName),
        scriptBrush,
        xmlBrush = new sh.brushes.Xml(),
        bracketsRegex = null,
        ref = this,
        methodsToExpose = 'getDiv getHtml init'.split(' ')
        ;

    if (brushClass == null)
        return;

    scriptBrush = new brushClass();

    for(var i = 0, l = methodsToExpose.length; i < l; i++)
        // make a closure so we don't lose the name after i changes
        (function() {
            var name = methodsToExpose[i];

            ref[name] = function()
            {
                return xmlBrush[name].apply(xmlBrush, arguments);
            };
        })();

    if (scriptBrush.htmlScript == null)
    {
        alert(sh.config.strings.brushNotHtmlScript + scriptBrushName);
        return;
    }

    xmlBrush.regexList.push(
        { regex: scriptBrush.htmlScript.code, func: process }
    );

    function offsetMatches(matches, offset)
    {
        for (var j = 0, l = matches.length; j < l; j++)
            matches[j].index += offset;
    }

    function process(match, info)
    {
        var code = match.code,
            matches = [],
            regexList = scriptBrush.regexList,
            offset = match.index + match.left.length,
            htmlScript = scriptBrush.htmlScript,
            result
            ;

        // add all matches from the code
        for (var i = 0, l = regexList.length; i < l; i++)
        {
            result = getMatches(code, regexList[i]);
            offsetMatches(result, offset);
            matches = matches.concat(result);
        }

        // add left script bracket
        if (htmlScript.left != null && match.left != null)
        {
            result = getMatches(match.left, htmlScript.left);
            offsetMatches(result, match.index);
            matches = matches.concat(result);
        }

        // add right script bracket
        if (htmlScript.right != null && match.right != null)
        {
            result = getMatches(match.right, htmlScript.right);
            offsetMatches(result, match.index + match[0].lastIndexOf(match.right));
            matches = matches.concat(result);
        }

        for (var j = 0, l = matches.length; j < l; j++)
            matches[j].brushName = brushClass.brushName;

        return matches;
    }
};

/**
 * Main Highlither class.
 * @constructor
 */
sh.Highlighter = function()
{
    // not putting any code in here because of the prototype inheritance
};

sh.Highlighter.prototype = {
    /**
     * Returns value of the parameter passed to the highlighter.
     * @param {String} name             Name of the parameter.
     * @param {Object} defaultValue     Default value.
     * @return {Object}                 Returns found value or default value otherwise.
     */
    getParam: function(name, defaultValue)
    {
        var result = this.params[name];
        return toBoolean(result == null ? defaultValue : result);
    },

    /**
     * Shortcut to document.createElement().
     * @param {String} name     Name of the element to create (DIV, A, etc).
     * @return {HTMLElement}    Returns new HTML element.
     */
    create: function(name)
    {
        return document.createElement(name);
    },

    /**
     * Applies all regular expression to the code and stores all found
     * matches in the `this.matches` array.
     * @param {Array} regexList     List of regular expressions.
     * @param {String} code         Source code.
     * @return {Array}              Returns list of matches.
     */
    findMatches: function(regexList, code)
    {
        var result = [];

        if (regexList != null)
            for (var i = 0, l = regexList.length; i < l; i++)
                // BUG: length returns len+1 for array if methods added to prototype chain (oising@gmail.com)
                if (typeof (regexList[i]) == "object")
                    result = result.concat(getMatches(code, regexList[i]));

        // sort and remove nested the matches
        return this.removeNestedMatches(result.sort(matchesSortCallback));
    },

    /**
     * Checks to see if any of the matches are inside of other matches.
     * This process would get rid of highligted strings inside comments,
     * keywords inside strings and so on.
     */
    removeNestedMatches: function(matches)
    {
        // Optimized by Jose Prado (http://joseprado.com)
        for (var i = 0, l = matches.length; i < l; i++)
        {
            if (matches[i] === null)
                continue;

            var itemI = matches[i],
                itemIEndPos = itemI.index + itemI.length
                ;

            for (var j = i + 1, l = matches.length; j < l && matches[i] !== null; j++)
            {
                var itemJ = matches[j];

                if (itemJ === null)
                    continue;
                else if (itemJ.index > itemIEndPos)
                    break;
                else if (itemJ.index == itemI.index && itemJ.length > itemI.length)
                    matches[i] = null;
                else if (itemJ.index >= itemI.index && itemJ.index < itemIEndPos)
                    matches[j] = null;
            }
        }

        return matches;
    },

    /**
     * Creates an array containing integer line numbers starting from the 'first-line' param.
     * @return {Array} Returns array of integers.
     */
    figureOutLineNumbers: function(code)
    {
        var lines = [],
            firstLine = parseInt(this.getParam('first-line'))
            ;

        eachLine(code, function(line, index)
        {
            lines.push(index + firstLine);
        });

        return lines;
    },

    /**
     * Determines if specified line number is in the highlighted list.
     */
    isLineHighlighted: function(lineNumber)
    {
        var list = this.getParam('highlight', []);

        if (typeof(list) != 'object' && list.push == null)
            list = [ list ];

        return indexOf(list, lineNumber.toString()) != -1;
    },

    /**
     * Generates HTML markup for a single line of code while determining alternating line style.
     * @param {Integer} lineNumber  Line number.
     * @param {String} code Line    HTML markup.
     * @return {String}             Returns HTML markup.
     */
    getLineHtml: function(lineIndex, lineNumber, code)
    {
        var classes = [
            'line',
            'number' + lineNumber,
            'index' + lineIndex,
            'alt' + (lineNumber % 2 == 0 ? 1 : 2).toString()
        ];

        if (this.isLineHighlighted(lineNumber))
            classes.push('highlighted');

        if (lineNumber == 0)
            classes.push('break');

        return '<div class="' + classes.join(' ') + '">' + code + '</div>';
    },

    /**
     * Generates HTML markup for line number column.
     * @param {String} code         Complete code HTML markup.
     * @param {Array} lineNumbers   Calculated line numbers.
     * @return {String}             Returns HTML markup.
     */
    getLineNumbersHtml: function(code, lineNumbers)
    {
        var html = '',
            count = splitLines(code).length,
            firstLine = parseInt(this.getParam('first-line')),
            pad = this.getParam('pad-line-numbers')
            ;

        if (pad == true)
            pad = (firstLine + count - 1).toString().length;
        else if (isNaN(pad) == true)
            pad = 0;

        for (var i = 0; i < count; i++)
        {
            var lineNumber = lineNumbers ? lineNumbers[i] : firstLine + i,
                code = lineNumber == 0 ? sh.config.space : padNumber(lineNumber, pad)
                ;

            html += this.getLineHtml(i, lineNumber, code);
        }

        return html;
    },

    /**
     * Splits block of text into individual DIV lines.
     * @param {String} code         Code to highlight.
     * @param {Array} lineNumbers   Calculated line numbers.
     * @return {String}             Returns highlighted code in HTML form.
     */
    getCodeLinesHtml: function(html, lineNumbers)
    {
        html = trim(html);

        var lines = splitLines(html),
            padLength = this.getParam('pad-line-numbers'),
            firstLine = parseInt(this.getParam('first-line')),
            html = '',
            brushName = this.getParam('brush')
            ;

        for (var i = 0, l = lines.length; i < l; i++)
        {
            var line = lines[i],
                indent = /^(&nbsp;|\s)+/.exec(line),
                spaces = null,
                lineNumber = lineNumbers ? lineNumbers[i] : firstLine + i;
                ;

            if (indent != null)
            {
                spaces = indent[0].toString();
                line = line.substr(spaces.length);
                spaces = spaces.replace(' ', sh.config.space);
            }

            line = trim(line);

            if (line.length == 0)
                line = sh.config.space;

            html += this.getLineHtml(
                i,
                lineNumber,
                (spaces != null ? '<code class="' + brushName + ' spaces">' + spaces + '</code>' : '') + line
            );
        }

        return html;
    },

    /**
     * Returns HTML for the table title or empty string if title is null.
     */
    getTitleHtml: function(title)
    {
        return title ? '<caption>' + title + '</caption>' : '';
    },

    /**
     * Finds all matches in the source code.
     * @param {String} code     Source code to process matches in.
     * @param {Array} matches   Discovered regex matches.
     * @return {String} Returns formatted HTML with processed mathes.
     */
    getMatchesHtml: function(code, matches)
    {
        var pos = 0,
            result = '',
            brushName = this.getParam('brush', '')
            ;

        function getBrushNameCss(match)
        {
            var result = match ? (match.brushName || brushName) : brushName;
            return result ? result + ' ' : '';
        };

        // Finally, go through the final list of matches and pull the all
        // together adding everything in between that isn't a match.
        for (var i = 0, l = matches.length; i < l; i++)
        {
            var match = matches[i],
                matchBrushName
                ;

            if (match === null || match.length === 0)
                continue;

            matchBrushName = getBrushNameCss(match);

            result += wrapLinesWithCode(code.substr(pos, match.index - pos), matchBrushName + 'plain')
                    + wrapLinesWithCode(match.value, matchBrushName + match.css)
                    ;

            pos = match.index + match.length + (match.offset || 0);
        }

        // don't forget to add whatever's remaining in the string
        result += wrapLinesWithCode(code.substr(pos), getBrushNameCss() + 'plain');

        return result;
    },

    /**
     * Generates HTML markup for the whole syntax highlighter.
     * @param {String} code Source code.
     * @return {String} Returns HTML markup.
     */
    getHtml: function(code)
    {
        var html = '',
            classes = [ 'syntaxhighlighter' ],
            tabSize,
            matches,
            lineNumbers
            ;

        // process light mode
        if (this.getParam('light') == true)
            this.params.toolbar = this.params.gutter = false;

        className = 'syntaxhighlighter';

        if (this.getParam('collapse') == true)
            classes.push('collapsed');

        if ((gutter = this.getParam('gutter')) == false)
            classes.push('nogutter');

        // add custom user style name
        classes.push(this.getParam('class-name'));

        // add brush alias to the class name for custom CSS
        classes.push(this.getParam('brush'));

        code = trimFirstAndLastLines(code)
            .replace(/\r/g, ' ') // IE lets these buggers through
            ;

        tabSize = this.getParam('tab-size');

        // replace tabs with spaces
        code = this.getParam('smart-tabs') == true
            ? processSmartTabs(code, tabSize)
            : processTabs(code, tabSize)
            ;

        // unindent code by the common indentation
        if (this.getParam('unindent'))
            code = unindent(code);

        if (gutter)
            lineNumbers = this.figureOutLineNumbers(code);

        // find matches in the code using brushes regex list
        matches = this.findMatches(this.regexList, code);
        // processes found matches into the html
        html = this.getMatchesHtml(code, matches);
        // finally, split all lines so that they wrap well
        html = this.getCodeLinesHtml(html, lineNumbers);

        // finally, process the links
        if (this.getParam('auto-links'))
            html = processUrls(html);

        if (typeof(navigator) != 'undefined' && navigator.userAgent && navigator.userAgent.match(/MSIE/))
            classes.push('ie');

        html =
            '<div id="' + getHighlighterId(this.id) + '" class="' + classes.join(' ') + '">'
                + (this.getParam('toolbar') ? sh.toolbar.getHtml(this) : '')
                + '<table border="0" cellpadding="0" cellspacing="0">'
                    + this.getTitleHtml(this.getParam('title'))
                    + '<tbody>'
                        + '<tr>'
                            + (gutter ? '<td class="gutter">' + this.getLineNumbersHtml(code) + '</td>' : '')
                            + '<td class="code">'
                                + '<div class="container">'
                                    + html
                                + '</div>'
                            + '</td>'
                        + '</tr>'
                    + '</tbody>'
                + '</table>'
            + '</div>'
            ;

        return html;
    },

    /**
     * Highlights the code and returns complete HTML.
     * @param {String} code     Code to highlight.
     * @return {Element}        Returns container DIV element with all markup.
     */
    getDiv: function(code)
    {
        if (code === null)
            code = '';

        this.code = code;

        var div = this.create('div');

        // create main HTML
        div.innerHTML = this.getHtml(code);

        // set up click handlers
        if (this.getParam('toolbar'))
            attachEvent(findElement(div, '.toolbar'), 'click', sh.toolbar.handler);

        if (this.getParam('quick-code'))
            attachEvent(findElement(div, '.code'), 'dblclick', quickCodeHandler);

        return div;
    },

    /**
     * Initializes the highlighter/brush.
     *
     * Constructor isn't used for initialization so that nothing executes during necessary
     * `new SyntaxHighlighter.Highlighter()` call when setting up brush inheritence.
     *
     * @param {Hash} params Highlighter parameters.
     */
    init: function(params)
    {
        this.id = guid();

        // register this instance in the highlighters list
        storeHighlighter(this);

        // local params take precedence over defaults
        this.params = merge(sh.defaults, params || {})

        // process light mode
        if (this.getParam('light') == true)
            this.params.toolbar = this.params.gutter = false;
    },

    /**
     * Converts space separated list of keywords into a regular expression string.
     * @param {String} str    Space separated keywords.
     * @return {String}       Returns regular expression string.
     */
    getKeywords: function(str)
    {
        str = str
            .replace(/^\s+|\s+$/g, '')
            .replace(/\s+/g, '|')
            ;

        return '\\b(?:' + str + ')\\b';
    },

    /**
     * Makes a brush compatible with the `html-script` functionality.
     * @param {Object} regexGroup Object containing `left` and `right` regular expressions.
     */
    forHtmlScript: function(regexGroup)
    {
        var regex = { 'end' : regexGroup.right.source };

        if(regexGroup.eof)
            regex.end = "(?:(?:" + regex.end + ")|$)";

        this.htmlScript = {
            left : { regex: regexGroup.left, css: 'script' },
            right : { regex: regexGroup.right, css: 'script' },
            code : XRegExp(
                "(?<left>" + regexGroup.left.source + ")" +
                "(?<code>.*?)" +
                "(?<right>" + regex.end + ")",
                "sgi"
                )
        };
    }
}; // end of Highlighter

return sh;
}(); // end of anonymous function

// CommonJS
typeof(exports) != 'undefined' ? exports.SyntaxHighlighter = SyntaxHighlighter : null;



// JS brush
;(function()
{
    // CommonJS
    SyntaxHighlighter = SyntaxHighlighter || (typeof require !== 'undefined'? require('shCore').SyntaxHighlighter : null);

    function Brush()
    {
        var keywords =  'break case catch class continue ' +
                'default delete do else enum export extends false  ' +
                'for function if implements import in instanceof ' +
                'interface let new null package private protected ' +
                'static return super switch ' +
                'this throw true try typeof var while with yield';

        var r = SyntaxHighlighter.regexLib;
        
        this.regexList = [
            { regex: r.multiLineDoubleQuotedString,                 css: 'string' },            // double quoted strings
            { regex: r.multiLineSingleQuotedString,                 css: 'string' },            // single quoted strings
            { regex: r.singleLineCComments,                         css: 'comments' },          // one line comments
            { regex: r.multiLineCComments,                          css: 'comments' },          // multiline comments
            { regex: /\s*#.*/gm,                                    css: 'preprocessor' },      // preprocessor tags like #region and #endregion
            { regex: new RegExp(this.getKeywords(keywords), 'gm'),  css: 'keyword' }            // keywords
            ];
    
        this.forHtmlScript(r.scriptScriptTags);
        this.langLabel = "Javascript";
    };

    Brush.prototype = new SyntaxHighlighter.Highlighter();
    Brush.aliases   = ['js', 'jscript', 'javascript', 'json'];

    SyntaxHighlighter.brushes.JScript = Brush;

    // CommonJS
    typeof(exports) != 'undefined' ? exports.Brush = Brush : null;
})();



// XML / HTML brush
;(function()
{
    // CommonJS
    SyntaxHighlighter = SyntaxHighlighter || (typeof require !== 'undefined'? require('shCore').SyntaxHighlighter : null);

    function Brush()
    {
        function process(match, regexInfo)
        {
            var constructor = SyntaxHighlighter.Match,
                code = match[0],
                tag = XRegExp.exec(code, XRegExp('(&lt;|<)[\\s\\/\\?!]*(?<name>[:\\w-\\.]+)', 'xg')),
                result = []
                ;

            if (match.attributes != null)
            {
                var attributes,
                    pos = 0,
                    regex = XRegExp('(?<name> [\\w:.-]+)' +
                                    '\\s*=\\s*' +
                                    '(?<value> ".*?"|\'.*?\'|\\w+)',
                                    'xg');

                while ((attributes = XRegExp.exec(code, regex, pos)) != null)
                {
                    result.push(new constructor(attributes.name, match.index + attributes.index, 'color1'));
                    result.push(new constructor(attributes.value, match.index + attributes.index + attributes[0].indexOf(attributes.value), 'string'));
                    pos = attributes.index + attributes[0].length;
                }
            }

            if (tag != null)
                result.push(
                    new constructor(tag.name, match.index + tag[0].indexOf(tag.name), 'keyword')
                );

            return result;
        }

        this.regexList = [
            { regex: XRegExp('(\\&lt;|<)\\!\\[[\\w\\s]*?\\[(.|\\s)*?\\]\\](\\&gt;|>)', 'gm'),           css: 'color2' },    // <![ ... [ ... ]]>
            { regex: SyntaxHighlighter.regexLib.xmlComments,                                                css: 'comments' },  // <!-- ... -->
            { regex: XRegExp('(&lt;|<)[\\s\\/\\?!]*(\\w+)(?<attributes>.*?)[\\s\\/\\?]*(&gt;|>)', 'sg'), func: process }
        ];
        this.langLabel = "HTML";
    };

    Brush.prototype = new SyntaxHighlighter.Highlighter();
    Brush.aliases   = ['xml', 'xhtml', 'xslt', 'html', 'plist'];

    SyntaxHighlighter.brushes.Xml = Brush;

    // CommonJS
    typeof(exports) != 'undefined' ? exports.Brush = Brush : null;
})();



// CSS brush
;(function()
{
    // CommonJS
    SyntaxHighlighter = SyntaxHighlighter || (typeof require !== 'undefined'? require('shCore').SyntaxHighlighter : null);

    function Brush()
    {
        function getKeywordsCSS(str)
        {
            return '\\b([a-z_]|)' + str.replace(/ /g, '(?=:)\\b|\\b([a-z_\\*]|\\*|)') + '(?=:)\\b';
        };
    
        function getValuesCSS(str)
        {
            return '\\b' + str.replace(/ /g, '(?!-)(?!:)\\b|\\b()') + '\:\\b';
        };

        var keywords =  'ascent azimuth background-attachment background-color background-image background-position ' +
                        'background-repeat background baseline bbox border-collapse border-color border-spacing border-style border-top ' +
                        'border-right border-bottom border-left border-top-color border-right-color border-bottom-color border-left-color ' +
                        'border-top-style border-right-style border-bottom-style border-left-style border-top-width border-right-width ' +
                        'border-bottom-width border-left-width border-width border bottom cap-height caption-side centerline clear clip color ' +
                        'content counter-increment counter-reset cue-after cue-before cue cursor definition-src descent direction display ' +
                        'elevation empty-cells float font-size-adjust font-family font-size font-stretch font-style font-variant font-weight font ' +
                        'height left letter-spacing line-height list-style-image list-style-position list-style-type list-style margin-top ' +
                        'margin-right margin-bottom margin-left margin marker-offset marks mathline max-height max-width min-height min-width orphans ' +
                        'outline-color outline-style outline-width outline overflow padding-top padding-right padding-bottom padding-left padding page ' +
                        'page-break-after page-break-before page-break-inside pause pause-after pause-before pitch pitch-range play-during position ' +
                        'quotes right richness size slope src speak-header speak-numeral speak-punctuation speak speech-rate stemh stemv stress ' +
                        'table-layout text-align top text-decoration text-indent text-shadow text-transform unicode-bidi unicode-range units-per-em ' +
                        'vertical-align visibility voice-family volume white-space widows width widths word-spacing x-height z-index';

        var values =    'above absolute all always aqua armenian attr aural auto avoid baseline behind below bidi-override black blink block blue bold bolder '+
                        'both bottom braille capitalize caption center center-left center-right circle close-quote code collapse compact condensed '+
                        'continuous counter counters crop cross crosshair cursive dashed decimal decimal-leading-zero default digits disc dotted double '+
                        'embed embossed e-resize expanded extra-condensed extra-expanded fantasy far-left far-right fast faster fixed format fuchsia '+
                        'gray green groove handheld hebrew help hidden hide high higher icon inline-table inline inset inside invert italic '+
                        'justify landscape large larger left-side left leftwards level lighter lime line-through list-item local loud lower-alpha '+
                        'lowercase lower-greek lower-latin lower-roman lower low ltr marker maroon medium message-box middle mix move narrower '+
                        'navy ne-resize no-close-quote none no-open-quote no-repeat normal nowrap n-resize nw-resize oblique olive once open-quote outset '+
                        'outside overline pointer portrait pre print projection purple red relative repeat repeat-x repeat-y rgb ridge right right-side '+
                        'rightwards rtl run-in screen scroll semi-condensed semi-expanded separate se-resize show silent silver slower slow '+
                        'small small-caps small-caption smaller soft solid speech spell-out square s-resize static status-bar sub super sw-resize '+
                        'table-caption table-cell table-column table-column-group table-footer-group table-header-group table-row table-row-group teal '+
                        'text-bottom text-top thick thin top transparent tty tv ultra-condensed ultra-expanded underline upper-alpha uppercase upper-latin '+
                        'upper-roman url visible wait white wider w-resize x-fast x-high x-large x-loud x-low x-slow x-small x-soft xx-large xx-small yellow';

        var fonts =     '[mM]onospace [tT]ahoma [vV]erdana [aA]rial [hH]elvetica [sS]ans-serif [sS]erif [cC]ourier mono sans serif';
    
        this.regexList = [
            { regex: SyntaxHighlighter.regexLib.multiLineCComments,     css: 'comments' },  // multiline comments
            { regex: SyntaxHighlighter.regexLib.doubleQuotedString,     css: 'string' },    // double quoted strings
            { regex: SyntaxHighlighter.regexLib.singleQuotedString,     css: 'string' },    // single quoted strings
            { regex: /\#[a-fA-F0-9]{3,6}/g,                             css: 'value' },     // html colors
            { regex: /(-?\d+)(\.\d+)?(px|em|pt|\:|\%|)/g,               css: 'value' },     // sizes
            { regex: /!important/g,                                     css: 'color3' },    // !important
            { regex: new RegExp(getKeywordsCSS(keywords), 'gm'),        css: 'keyword' },   // keywords
            { regex: new RegExp(getValuesCSS(values), 'g'),             css: 'value' },     // values
            { regex: new RegExp(this.getKeywords(fonts), 'g'),          css: 'color1' }     // fonts
            ];

        this.forHtmlScript({ 
            left: /(&lt;|<)\s*style.*?(&gt;|>)/gi, 
            right: /(&lt;|<)\/\s*style\s*(&gt;|>)/gi 
            });
        this.langLabel = "CSS";
    };

    Brush.prototype = new SyntaxHighlighter.Highlighter();
    Brush.aliases   = ['css'];

    SyntaxHighlighter.brushes.CSS = Brush;

    // CommonJS
    typeof(exports) != 'undefined' ? exports.Brush = Brush : null;
})();



// PHP brush
;(function()
{
    // CommonJS
    SyntaxHighlighter = SyntaxHighlighter || (typeof require !== 'undefined'? require('shCore').SyntaxHighlighter : null);

    function Brush()
    {
        var funcs   =   'abs acos acosh addcslashes addslashes ' +
                        'array_change_key_case array_chunk array_combine array_count_values array_diff '+
                        'array_diff_assoc array_diff_key array_diff_uassoc array_diff_ukey array_fill '+
                        'array_filter array_flip array_intersect array_intersect_assoc array_intersect_key '+
                        'array_intersect_uassoc array_intersect_ukey array_key_exists array_keys array_map '+
                        'array_merge array_merge_recursive array_multisort array_pad array_pop array_product '+
                        'array_push array_rand array_reduce array_reverse array_search array_shift '+
                        'array_slice array_splice array_sum array_udiff array_udiff_assoc '+
                        'array_udiff_uassoc array_uintersect array_uintersect_assoc '+
                        'array_uintersect_uassoc array_unique array_unshift array_values array_walk '+
                        'array_walk_recursive atan atan2 atanh base64_decode base64_encode base_convert '+
                        'basename bcadd bccomp bcdiv bcmod bcmul bindec bindtextdomain bzclose bzcompress '+
                        'bzdecompress bzerrno bzerror bzerrstr bzflush bzopen bzread bzwrite ceil chdir '+
                        'checkdate checkdnsrr chgrp chmod chop chown chr chroot chunk_split class_exists '+
                        'closedir closelog copy cos cosh count count_chars date decbin dechex decoct '+
                        'deg2rad delete ebcdic2ascii echo empty end ereg ereg_replace eregi eregi_replace error_log '+
                        'error_reporting escapeshellarg escapeshellcmd eval exec exit exp explode extension_loaded '+
                        'feof fflush fgetc fgetcsv fgets fgetss file_exists file_get_contents file_put_contents '+
                        'fileatime filectime filegroup fileinode filemtime fileowner fileperms filesize filetype '+
                        'floatval flock floor flush fmod fnmatch fopen fpassthru fprintf fputcsv fputs fread fscanf '+
                        'fseek fsockopen fstat ftell ftok getallheaders getcwd getdate getenv gethostbyaddr gethostbyname '+
                        'gethostbynamel getimagesize getlastmod getmxrr getmygid getmyinode getmypid getmyuid getopt '+
                        'getprotobyname getprotobynumber getrandmax getrusage getservbyname getservbyport gettext '+
                        'gettimeofday gettype glob gmdate gmmktime ini_alter ini_get ini_get_all ini_restore ini_set '+
                        'interface_exists intval ip2long is_a is_array is_bool is_callable is_dir is_double '+
                        'is_executable is_file is_finite is_float is_infinite is_int is_integer is_link is_long '+
                        'is_nan is_null is_numeric is_object is_readable is_real is_resource is_scalar is_soap_fault '+
                        'is_string is_subclass_of is_uploaded_file is_writable is_writeable mkdir mktime nl2br '+
                        'parse_ini_file parse_str parse_url passthru pathinfo print readlink realpath rewind rewinddir rmdir '+
                        'round str_ireplace str_pad str_repeat str_replace str_rot13 str_shuffle str_split '+
                        'str_word_count strcasecmp strchr strcmp strcoll strcspn strftime strip_tags stripcslashes '+
                        'stripos stripslashes stristr strlen strnatcasecmp strnatcmp strncasecmp strncmp strpbrk '+
                        'strpos strptime strrchr strrev strripos strrpos strspn strstr strtok strtolower strtotime '+
                        'strtoupper strtr strval substr substr_compare';

        var keywords =  'abstract and array as break case catch cfunction class clone const continue declare default die do ' +
                        'else elseif enddeclare endfor endforeach endif endswitch endwhile extends final finally for foreach ' +
                        'function global goto if implements include include_once interface instanceof insteadof namespace new ' +
                        'old_function or private protected public return require require_once static switch ' +
                        'trait throw try use var while xor yield ';
        
        var constants   = '__FILE__ __LINE__ __METHOD__ __FUNCTION__ __CLASS__';

        this.regexList = [
            { regex: SyntaxHighlighter.regexLib.singleLineCComments,    css: 'comments' },          // one line comments
            { regex: SyntaxHighlighter.regexLib.multiLineCComments,     css: 'comments' },          // multiline comments
            { regex: SyntaxHighlighter.regexLib.doubleQuotedString,     css: 'string' },            // double quoted strings
            { regex: SyntaxHighlighter.regexLib.singleQuotedString,     css: 'string' },            // single quoted strings
            { regex: /\$\w+/g,                                          css: 'variable' },          // variables
            { regex: new RegExp(this.getKeywords(funcs), 'gmi'),        css: 'functions' },         // common functions
            { regex: new RegExp(this.getKeywords(constants), 'gmi'),    css: 'constants' },         // constants
            { regex: new RegExp(this.getKeywords(keywords), 'gm'),      css: 'keyword' }            // keyword
            ];

        this.forHtmlScript(SyntaxHighlighter.regexLib.phpScriptTags);
        this.langLabel = "PHP";
    };

    Brush.prototype = new SyntaxHighlighter.Highlighter();
    Brush.aliases   = ['php'];

    SyntaxHighlighter.brushes.Php = Brush;

    // CommonJS
    typeof(exports) != 'undefined' ? exports.Brush = Brush : null;
})();


;(function()
{
    // CommonJS
    SyntaxHighlighter = SyntaxHighlighter || (typeof require !== 'undefined'? require('shCore').SyntaxHighlighter : null);

    function Brush()
    {
        var funcs   =   'abs avg case cast coalesce convert count current_timestamp ' +
                        'current_user day isnull left lower month nullif replace right ' +
                        'session_user space substring sum system_user upper user year';

        var keywords =  'absolute action add after alter as asc at authorization begin bigint ' +
                        'binary bit by cascade char character check checkpoint close collate ' +
                        'column commit committed connect connection constraint contains continue ' +
                        'create cube current current_date current_time cursor database date ' +
                        'deallocate dec decimal declare default delete desc distinct double drop ' +
                        'dynamic else end end-exec escape except exec execute false fetch first ' +
                        'float for force foreign forward free from full function global goto grant ' +
                        'group grouping having hour ignore index inner insensitive insert instead ' +
                        'int integer intersect into is isolation key last level load local max min ' +
                        'minute modify move name national nchar next no numeric of off on only ' +
                        'open option order out output partial password precision prepare primary ' +
                        'prior privileges procedure public read real references relative repeatable ' +
                        'restrict return returns revoke rollback rollup rows rule schema scroll ' +
                        'second section select sequence serializable set size smallint static ' +
                        'statistics table temp temporary then time timestamp to top transaction ' +
                        'translation trigger true truncate uncommitted union unique update values ' +
                        'varchar varying view when where with work';

        var operators = 'all and any between cross in join like not null or outer some';

        this.regexList = [
            { regex: /--(.*)$/gm,                                               css: 'comments' },   // one line comments
            { regex: /\/\*([^\*][\s\S]*?)?\*\//gm,                              css: 'comments' },   // multi line comments
            { regex: SyntaxHighlighter.regexLib.multiLineDoubleQuotedString,    css: 'string' },     // double quoted strings
            { regex: SyntaxHighlighter.regexLib.multiLineSingleQuotedString,    css: 'string' },     // single quoted strings
            { regex: new RegExp(this.getKeywords(funcs), 'gmi'),                css: 'color2' },     // functions
            { regex: new RegExp(this.getKeywords(operators), 'gmi'),            css: 'color1' },     // operators and such
            { regex: new RegExp(this.getKeywords(keywords), 'gmi'),             css: 'keyword' }     // keyword
            ];

        this.langLabel = "SQL";
    };

    Brush.prototype = new SyntaxHighlighter.Highlighter();
    Brush.aliases   = ['sql'];

    SyntaxHighlighter.brushes.Sql = Brush;

    // CommonJS
    typeof(exports) != 'undefined' ? exports.Brush = Brush : null;
})();



;(function()
{
    // CommonJS
    SyntaxHighlighter = SyntaxHighlighter || (typeof require !== 'undefined'? require('shCore').SyntaxHighlighter : null);

    function Brush()
    {
        this.langLabel = "Plain text";
    };

    Brush.prototype = new SyntaxHighlighter.Highlighter();
    Brush.aliases   = ['text', 'plain'];

    SyntaxHighlighter.brushes.Plain = Brush;

    // CommonJS
    typeof(exports) != 'undefined' ? exports.Brush = Brush : null;
})();

;(function()
{
    // CommonJS
    SyntaxHighlighter = SyntaxHighlighter || (typeof require !== 'undefined'? require('shCore').SyntaxHighlighter : null);

    function Brush()
    {
        var keywords =  'abstract as async await base bool break byte case catch char checked class const ' +
                        'continue decimal default delegate do double else enum event explicit volatile ' +
                        'extern false finally fixed float for foreach get goto if implicit in int ' +
                        'interface internal is lock long namespace new null object operator out ' +
                        'override params private protected public readonly ref return sbyte sealed set ' +
                        'short sizeof stackalloc static string struct switch this throw true try ' +
                        'typeof uint ulong unchecked unsafe ushort using virtual void while var ' +
                        'from group by into select let where orderby join on equals ascending descending';

        function fixComments(match, regexInfo)
        {
            var css = (match[0].indexOf("///") == 0)
                ? 'color1'
                : 'comments'
                ;
            
            return [new SyntaxHighlighter.Match(match[0], match.index, css)];
        }

        this.regexList = [
            { regex: SyntaxHighlighter.regexLib.singleLineCComments,    func : fixComments },       // one line comments
            { regex: SyntaxHighlighter.regexLib.multiLineCComments,     css: 'comments' },          // multiline comments
            { regex: /@"(?:[^"]|"")*"/g,                                css: 'string' },            // @-quoted strings
            { regex: SyntaxHighlighter.regexLib.doubleQuotedString,     css: 'string' },            // strings
            { regex: SyntaxHighlighter.regexLib.singleQuotedString,     css: 'string' },            // strings
            { regex: /^\s*#.*/gm,                                       css: 'preprocessor' },      // preprocessor tags like #region and #endregion
            { regex: new RegExp(this.getKeywords(keywords), 'gm'),      css: 'keyword' },           // c# keyword
            { regex: /\bpartial(?=\s+(?:class|interface|struct)\b)/g,   css: 'keyword' },           // contextual keyword: 'partial'
            { regex: /\byield(?=\s+(?:return|break)\b)/g,               css: 'keyword' }            // contextual keyword: 'yield'
            ];
        
        this.forHtmlScript(SyntaxHighlighter.regexLib.aspScriptTags);
        this.langLabel = "C#";
    };

    Brush.prototype = new SyntaxHighlighter.Highlighter();
    Brush.aliases   = ['c#', 'cs', 'c-sharp', 'csharp'];

    SyntaxHighlighter.brushes.CSharp = Brush;

    // CommonJS
    typeof(exports) != 'undefined' ? exports.Brush = Brush : null;
})();


SyntaxHighlighter.all();

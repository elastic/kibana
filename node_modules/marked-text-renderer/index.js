function TextRenderer(options) {
    if(!(this instanceof TextRenderer)) {
        return new TextRenderer(options);
    }
    this.options = options || {};
}

TextRenderer.prototype.code = function(code, lang, escaped) {
    return '\n\n' + code + '\n\n';
};

TextRenderer.prototype.blockquote = function(quote) {
    return '\t' + quote + '\n';
};

TextRenderer.prototype.html = function(html) {
    return html;
};

TextRenderer.prototype.heading = function(text, level, raw) {
    return text;
};

TextRenderer.prototype.hr = function() {
    return '\n\n';
};

TextRenderer.prototype.list = function(body, ordered) {
    return body;
};

TextRenderer.prototype.listitem = function(text) {
    return '\t' + text + '\n';
};

TextRenderer.prototype.paragraph = function(text) {
    return '\n' + text + '\n';
};

TextRenderer.prototype.table = function(header, body) {
    return '\n' + header + '\n' + body + '\n\n';
};

TextRenderer.prototype.tablerow = function(content) {
    return content + '\n';
};

TextRenderer.prototype.tablecell = function(content, flags) {
    return content + '\t';
};

// span level renderer
TextRenderer.prototype.strong = function(text) {
    return text;
};

TextRenderer.prototype.em = function(text) {
    return text;
};

TextRenderer.prototype.codespan = function(text) {
    return text;
};

TextRenderer.prototype.br = function() {
    return '\n\n';
};

TextRenderer.prototype.del = function(text) {
    return text;
};

TextRenderer.prototype.link = function(href, title, text) {
    return [title, text].filter(Boolean).join(' ');
};

TextRenderer.prototype.image = function(href, title, text) {
    return [title, text].filter(Boolean).join(' ');
};

TextRenderer.prototype.math = noop;

function noop() {
    return '\n';
}

// Exports
module.exports = TextRenderer;


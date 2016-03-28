var Toc = require('markdown-toc');
var Fs = require('fs');

var filename = './README.md';

var readme = Fs.readFileSync(filename, 'utf8');
var tocOptions = {
    bullets: '-',
    slugify: function (text) {

        return text.toLowerCase()
            .replace(/\s/g, '-')
            .replace(/[^\w-]/g, '');
    }
};

Fs.writeFileSync(filename, Toc.insert(readme, tocOptions));

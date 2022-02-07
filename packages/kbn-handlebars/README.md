# @kbn/handlebars

A custom version of the handlebars package which, to improve security, does not use `eval` or `new Function`. This means that templates can't be compiled in advance and hence, rendering the templates is a lot slower.
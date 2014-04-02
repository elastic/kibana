JS_FILES = \
		src/index.js \
		src/core.js \
		src/modules/area.js \
		src/modules/dendrogram.js \
		src/modules/heatmap.js \
		src/modules/histogram.js \
		src/modules/horizon.js \
		src/modules/line.js \
		src/modules/map.js \
		src/modules/map-flat.js \
		src/modules/map-globe.js \
		src/modules/pie.js \
		src/modules/scatterplot.js \
		src/modules/sortedTable.js \
		src/modules/sparkline.js \
		src/modules/spider.js \
		src/modules/sunburst.js \
		src/modules/table.js \
		src/modules/treemap.js \
		src/end.js

CSS_FILES = \
		src/css/k4.d3.css

JS_COMPILER = \
		uglifyjs

CSS_COMPILER = \
		cssmin

all: k4.d3.js k4.d3.min.js k4.d3.css k4.d3.min.css
k4.d3.js: $(JS_FILES)
k4.d3.min.js: $(JS_FILES)
k4.d3.css: $(CSS_FILES)
k4.d3.min.css: $(CSS_FILES)

k4.d3.js: Makefile
		rm -f $@
		cat $(filter %.js,$^) >> $@

k4.d3.js: Makefile
		rm -f $@
		cat $(filter %.css,$^) >> $@

%.min.js:: Makefile
		rm -f $@
		$(JS_COMPILER) k4.d3.js >> $@

%.min.css:: Makefile
		rm -f $@
		$(CSS_COMPILER) k4.d3.css >> $@

clean:
		rm -rf k4.d3*.js k4.d3*.css

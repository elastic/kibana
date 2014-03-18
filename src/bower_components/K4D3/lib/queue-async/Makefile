all: \
	queue.min.js \
	component.json \
	package.json

component.json: src/component.js queue.js
	@rm -f $@
	node src/component.js > $@
	@chmod a-w $@

package.json: src/package.js queue.js
	@rm -f $@
	node src/package.js > $@
	@chmod a-w $@

test: all
	node_modules/.bin/vows
	@echo

%.min.js: %.js Makefile
	@rm -f $@
	node_modules/.bin/uglifyjs $< -c -m -o $@

clean:
	rm -f queue.min.js component.json package.json

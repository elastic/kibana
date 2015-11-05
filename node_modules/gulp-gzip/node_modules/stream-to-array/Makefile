NODE ?= node
BIN = ./node_modules/.bin/

test:
	@${NODE} ${BIN}mocha \
		--reporter spec \
		--bail

clean:
	@rm -rf node_modules

.PHONY: test clean
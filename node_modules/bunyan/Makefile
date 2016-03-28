
#---- Tools

NODEUNIT := ./node_modules/.bin/nodeunit
SUDO := sudo
ifeq ($(shell uname -s),SunOS)
	# On SunOS (e.g. SmartOS) we expect to run the test suite as the
	# root user -- necessary to run dtrace. Therefore `pfexec` isn't
	# necessary.
	SUDO :=
endif
DTRACE_UP_IN_HERE=
ifeq ($(shell uname -s),SunOS)
    DTRACE_UP_IN_HERE=1
endif
ifeq ($(shell uname -s),Darwin)
    DTRACE_UP_IN_HERE=1
endif
NODEOPT ?= $(HOME)/opt


#---- Files

JSSTYLE_FILES := $(shell find lib test tools examples -name "*.js") bin/bunyan
# All test files *except* dtrace.test.js.
NON_DTRACE_TEST_FILES := $(shell ls -1 test/*.test.js | grep -v dtrace | xargs)


#---- Targets

all $(NODEUNIT):
	npm install $(NPM_INSTALL_FLAGS)

# Ensure all version-carrying files have the same version.
.PHONY: versioncheck
versioncheck:
	@echo version is: $(shell cat package.json | json version)
	[[ `cat package.json | json version` == `grep '^## ' CHANGES.md | head -1 | awk '{print $$2}'` ]]
	[[ `cat package.json | json version` == `grep '^var VERSION' bin/bunyan | awk -F"'" '{print $$2}'` ]]
	[[ `cat package.json | json version` == `grep '^var VERSION' lib/bunyan.js | awk -F"'" '{print $$2}'` ]]
	@echo Version check ok.

.PHONY: cutarelease
cutarelease: versioncheck check
	[[ `git status | tail -n1 | cut -c1-17` == "nothing to commit" ]]
	./tools/cutarelease.py -p bunyan -f package.json -f lib/bunyan.js -f bin/bunyan

.PHONY: docs
docs:
	@[[ `which ronn` ]] || (echo "No 'ronn' on your PATH. Install with 'gem install ronn'" && exit 2)
	mkdir -p man/man1
	ronn --style=toc --manual="bunyan manual" --date=$(shell git log -1 --pretty=format:%cd --date=short) --roff --html docs/bunyan.1.ronn
	python -c 'import sys; h = open("docs/bunyan.1.html").read(); h = h.replace(".mp dt.flush {float:left;width:8ex}", ""); open("docs/bunyan.1.html", "w").write(h)'
	python -c 'import sys; h = open("docs/bunyan.1.html").read(); h = h.replace("</body>", """<a href="https://github.com/trentm/node-bunyan"><img style="position: absolute; top: 0; right: 0; border: 0;" src="https://s3.amazonaws.com/github/ribbons/forkme_right_darkblue_121621.png" alt="Fork me on GitHub"></a></body>"""); open("docs/bunyan.1.html", "w").write(h)'
	@echo "# test with 'man ./docs/bunyan.1' and 'open ./docs/bunyan.1.html'"

.PHONY: publish
publish:
	mkdir -p tmp
	[[ -d tmp/bunyan-gh-pages ]] || git clone git@github.com:trentm/node-bunyan.git tmp/bunyan-gh-pages
	cd tmp/bunyan-gh-pages && git checkout gh-pages && git pull --rebase origin gh-pages
	cp docs/index.html tmp/bunyan-gh-pages/index.html
	cp docs/bunyan.1.html tmp/bunyan-gh-pages/bunyan.1.html
	(cd tmp/bunyan-gh-pages \
		&& git commit -a -m "publish latest docs" \
		&& git push origin gh-pages || true)

.PHONY: distclean
distclean:
	rm -rf node_modules


#---- test

.PHONY: test
test: $(NODEUNIT)
	test -z "$(DTRACE_UP_IN_HERE)" || test -n "$(SKIP_DTRACE)" || \
		(node -e 'require("dtrace-provider").createDTraceProvider("isthisthingon")' && \
		echo "\nNote: Use 'SKIP_DTRACE=1 make test' to skip parts of the test suite that require root." && \
		$(SUDO) $(NODEUNIT) test/dtrace.test.js)
	$(NODEUNIT) $(NON_DTRACE_TEST_FILES)

# Test will all node supported versions (presumes install locations I use on
# my machine -- "~/opt/node-VER"):
# Note: 'test10' is last so (if all is well) I end up with a binary
# dtrace-provider build for node 0.10 (my current version).
.PHONY: testall
testall: test5 test4 test012 test010

.PHONY: test5
test5:
	@echo "# Test node 5.x (with node `$(NODEOPT)/node-5/bin/node --version`)"
	@$(NODEOPT)/node-5/bin/node --version | grep '^v5\.'
	PATH="$(NODEOPT)/node-5/bin:$(PATH)" make distclean all test
.PHONY: test4
test4:
	@echo "# Test node 4.x (with node `$(NODEOPT)/node-4/bin/node --version`)"
	@$(NODEOPT)/node-4/bin/node --version | grep '^v4\.'
	PATH="$(NODEOPT)/node-4/bin:$(PATH)" make distclean all test
.PHONY: test012
test012:
	@echo "# Test node 0.12.x (with node `$(NODEOPT)/node-0.12/bin/node --version`)"
	@$(NODEOPT)/node-0.12/bin/node --version | grep '^v0\.12\.'
	PATH="$(NODEOPT)/node-0.12/bin:$(PATH)" make distclean all test
.PHONY: test010
test010:
	@echo "# Test node 0.10.x (with node `$(NODEOPT)/node-0.10/bin/node --version`)"
	@$(NODEOPT)/node-0.10/bin/node --version | grep '^v0\.10\.'
	PATH="$(NODEOPT)/node-0.10/bin:$(PATH)" make distclean all test


#---- check

.PHONY: check-jsstyle
check-jsstyle: $(JSSTYLE_FILES)
	./tools/jsstyle -o indent=4,doxygen,unparenthesized-return=0,blank-after-start-comment=0,leading-right-paren-ok=1 $(JSSTYLE_FILES)

.PHONY: check
check: check-jsstyle
	@echo "Check ok."

.PHONY: prepush
prepush: check testall
	@echo "Okay to push."

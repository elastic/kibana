from distutils.core import Command
import os
import sys
import pkg_resources
try:
    import json
except ImportError:
    import simplejson as json

PY3 = sys.version_info[0] == 3

if PY3:
    def u(s):
        return s
else:
    def u(s):
        if isinstance(u, unicode):
            return u
        return s.decode('utf-8')


# Note, the last time I coded python daily was at Google, so it's entirely
# possible some of my techniques below are outdated or bad.
# If you have fixes, let me know.


class get_metadata(Command):
    description = "get package metadata"
    user_options = [
        ('load-requirements-txt', 'l',
         "load dependencies from requirements.txt"),
        ("output=", "o", "output destination for metadata json")
    ]
    boolean_options = ['load-requirements-txt']

    def initialize_options(self):
        self.load_requirements_txt = False
        self.cwd = None
        self.output = None

    def finalize_options(self):
        self.cwd = os.getcwd()
        self.requirements_txt = os.path.join(self.cwd, "requirements.txt")
        # make sure we have a requirements.txt
        if self.load_requirements_txt:
            self.load_requirements_txt = os.path.exists(self.requirements_txt)

    def process_dep(self, dep):
        deps = []
        if dep.specs:
            for operator, version in dep.specs:
                deps.append("%s %s %s" % (dep.project_name,
                        operator, version))
        else:
            deps.append(dep.project_name)

        return deps

    def run(self):
        data = {
            "name": self.distribution.get_name(),
            "version": self.distribution.get_version(),
            "author": u("%s <%s>") % (
                u(self.distribution.get_author()),
                u(self.distribution.get_author_email()),
            ),
            "description": self.distribution.get_description(),
            "license": self.distribution.get_license(),
            "url": self.distribution.get_url(),
        }

        if self.distribution.has_ext_modules():
            data["architecture"] = "native"
        else:
            data["architecture"] = "all"

        final_deps = []

        if self.load_requirements_txt:
            requirement = open(self.requirements_txt).readlines()
            for dep in pkg_resources.parse_requirements(requirement):
                final_deps.extend(self.process_dep(dep))
        else:
            if getattr(self.distribution, 'install_requires', None):
                for dep in pkg_resources.parse_requirements(
                        self.distribution.install_requires):
                    final_deps.extend(self.process_dep(dep))

        data["dependencies"] = final_deps

        output = open(self.output, "w")
        if hasattr(json, 'dumps'):
            output.write(json.dumps(data, indent=2))
        else:
            # For Python 2.5 and Debian's python-json
            output.write(json.write(data))

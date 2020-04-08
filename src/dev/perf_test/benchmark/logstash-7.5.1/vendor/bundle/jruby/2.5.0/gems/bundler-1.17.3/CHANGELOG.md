## 1.17.3 (2018-12-27)

Bugfixes:

 - Fix a Bundler error when installing gems on old versions of RubyGems ([#6839](https://github.com/bundler/bundler/issues/6839), @colby-swandale)
 - Fix a rare issue where Bundler was removing itself after a `bundle clean` ([#6829](https://github.com/bundler/bundler/issues/6829), @colby-swandale)

Documentation:

  - Add entry for the `bundle remove` command to the main Bundler manual page

## 1.17.2 (2018-12-11)

 - Add compatibility for bundler merge with Ruby 2.6

## 1.17.1 (2018-10-25)

 - Convert `Pathname`s to `String`s before sorting them, fixing #6760 and #6758 ([#6761](https://github.com/bundler/bundler/pull/6761), @alexggordon)

## 1.17.0 (2018-10-25)

No new changes.

## 1.17.0.pre.2 (2018-10-13)

Features:

  - Configure Bundler home, cache, config and plugin directories with `BUNDLE_USER_HOME`, `BUNDLE_USER_CACHE`, `BUNDLE_USER_CONFIG` and `BUNDLE_USER_PLUGIN` env vars ([#4333](https://github.com/bundler/bundler/issues/4333), @gwerbin)
  - Add `--all` option to `bundle binstubs` that will generate an executable file for all gems with commands in the bundle
  - Add `bundle remove` command to remove gems from the Gemfile via the CLI
  - Improve checking file permissions and asking for `sudo` in Bundler when it doesn't need to
  - Add error message to `bundle add` to check adding duplicate gems to the Gemfile
  - When asking for `sudo`, Bundler will show a list of folders/files that require elevated permissions to write to.

The following new features are available but are not enabled by default. These are intended to be tested by users for the upcoming release of Bundler 2.

  - Improve deprecation warning message for `bundle show` command
  - Improve deprecation warning message for the `--force` option in `bundle install`

## 1.17.0.pre.1 (2018-09-24)

Features:

  - Check folder/file permissions of the Bundle home directory in the `bundle doctor` command ([#5786](https://github.com/bundler/bundler/issues/5786), @ajwann)
  - Remove compiled gem extensions when running `bundle clean` ([#5596](https://github.com/bundler/bundler/issues/5596), @akhramov)
  - Add `--paths` option to `bundle list` command ([#6172](https://github.com/bundler/bundler/issues/6172), @colby-swandale)
  - Add base error class to gems generated from `bundle gem` ([#6260](https://github.com/bundler/bundler/issues/6260), @christhekeele)
  - Correctly re-install gem extensions with a git source when running `bundle pristine` ([#6294](https://github.com/bundler/bundler/issues/6294), @wagenet)
  - Add config option to disable platform warnings ([#6124](https://github.com/bundler/bundler/issues/6124), @agrim123)
  - Add `--skip-install` option to `bundle add` command to add gems to the Gemfile without installation ([#6511](https://github.com/bundler/bundler/issues/6511), @agrim123)
  - Add `--only-explicit` option to `bundle outdated` to list only outdated gems in the Gemfile ([#5366](https://github.com/bundler/bundler/issues/5366), @peret)
  - Support adding multiple gems to the Gemfile with `bundle add` ([#6543](https://github.com/bundler/bundler/issues/6543), @agrim123)
  - Make registered plugin events easier to manage in the Plugin API (@jules2689)
  - Add new gem install hooks to the Plugin API (@jules2689)
  - Add `--optimistic` and `--strict` options to `bundle add` ([#6553](https://github.com/bundler/bundler/issues/6553), @agrim123)
  - Add `--without-group` and `--only-group` options to `bundle list` ([#6564](https://github.com/bundler/bundler/issues/6564), @agrim123)
  - Add `--gemfile` option to the `bundle exec` command ([#5924](https://github.com/bundler/bundler/issues/5924), @ankitkataria)

The following new features are available but are not enabled by default. These are intended to be tested by users for the upcoming release of Bundler 2.

  - Make `install --path` relative to the current working directory ([#2048](https://github.com/bundler/bundler/issues/2048), @igorbozato)
  - Auto-configure job count ([#5808](https://github.com/bundler/bundler/issues/5808), @segiddins)
  - Use the Gem Version Promoter for major gem updates ([#5993](https://github.com/bundler/bundler/issues/5993), @segiddins)
  - Add config option to add the Ruby scope to `bundle config path` when configured globally (@segiddins)

## 1.16.6 (2018-10-05)

Changes:

  - Add an error message when adding a gem with `bundle add` that's already in the bundle ([#6341](https://github.com/bundler/bundler/issues/6341), @agrim123)
  - Add Homepage, Source Code and Chanagelog URI metadata fields to the `bundle gem` gemspec template (@walf443)

Bugfixes:

  - Fix issue where updating a gem resulted in the gem's version being downgraded when `BUNDLE_ONLY_UPDATE_TO_NEWER_VERSIONS` was set ([#6529](https://github.com/bundler/bundler/issues/6529), @theflow)
  - Fix some rescue calls that don't specifiy error type (@utilum)
  - Fix an issue when the Lockfile would contain platform-specific gems that it didn't need ([#6491](https://github.com/bundler/bundler/issues/6491), @segiddins)
  - Improve handlding of adding new gems with only a single group to the Gemfile in `bundle add` (@agrim123)
  - Refactor check for OpenSSL in `bundle env` (@voxik)
  - Remove an unnecessary assignment in Metadata (@voxik)

Documentation:

  - Update docs to reflect revised guidance to check in Gemfile.lock into version control for gems ([#5879](https://github.com/bundler/bundler/issues/5879), @arbonap)
  - Add documentation for the `--all` flag in `bundle update` (@agrim123)
  - Update README to use `bundle add` in usage examples (@hdf1986)

## 1.16.5 (2018-09-18)

Changes:

  - Add support for TruffleRuby (@eregon)

Bugfixes:

  - Avoid printing git errors when checking the version on incorrectly packaged versions of Bundler ([#6453](https://github.com/bundler/bundler/issues/6453), @greysteil)
  - Fix issue where Bundler does not check the given class when comparing equality in DepProxy (@ChrisBr)
  - Handle `RangeNotSatisfiable` error in Compact Index (@MaxLap)
  - Check for initialized `search` variable in `LazySpecification` (@voxik)
  - Fix LoadError occurring in nested bundle exec calls ([#6537](https://github.com/bundler/bundler/issues/6537), @colby-swandale)
  - Check that Bundler::Deprecate is not an autoload constant ([#6163](https://github.com/bundler/bundler/issues/6163), @eregon)
  - Prefer non-pre-release versions when performing a `bundle update --patch` ([#6684](https://github.com/bundler/bundler/issues/6684), @segiddins)

## 1.16.4 (2018-08-17)

Changes:

  - Welcome new members to the Bundler core team (@indirect)
  - Don't mutate original error trees when determining version_conflict_message (@greysteil)
  - Update vendored Molinillo to 0.6.6 (@segiddins)

Bugfixes:

  - Reword bundle update regression message to be more clear to the user when a gem's version is downgraded ([#6584](https://github.com/bundler/bundler/issues/6584), @ralphbolo)
  - Respect --conservative flag when updating a dependency group ([#6560](https://github.com/bundler/bundler/issues/6560), @greysteil)
  - Fix issue where a pre-release version was not being selected when it's specified in the Gemfile ([#6449](https://github.com/bundler/bundler/issues/6449), @akihiro17)
  - Fix issue where `Etc` was not loaded when getting the user's home dir ([#6640](https://github.com/bundler/bundler/issues/6640), @colby-swandale)
  - Use UTF-8 for reading files including Gemfile ([#6660](https://github.com/bundler/bundler/issues/6660), @eregon)
  - Remove unnecessary `while` loop in path resolver helper (@ojab)

Documentation:

  - Document that `bundle show [--paths]` sorts results by name (@kemitchell)

## 1.16.3 (2018-07-17)

Features:

  - Support URI::File of Ruby 2.6 (@hsbt)

Bugfixes:

  - Expand symlinks during setup to allow Bundler to load correctly when using symlinks in $GEM_HOME ([#6465](https://github.com/bundler/bundler/issues/6465), @ojab, @indirect)
  - Dont let Bundler create temporary folders for gem installs which are owned by root ([#6258](https://github.com/bundler/bundler/issues/6258), @colby-swandale)
  - Don't fallback to using temporary directories when needed directories already exist ([#6546](https://github.com/bundler/bundler/issues/6546), @brodock)
  - Use SharedHelpers.filesystem_access when reading a Gemfile so friendly error messages can be given to the user ([#6541](https://github.com/bundler/bundler/issues/6541), @segiddins)
  - Check if source responds to `#remotes` before printing gem install error message ([#6211](https://github.com/bundler/bundler/issues/6211), @colby-swandale)
  - Handle Errno::ENOTSUP in the Bundler Process Lock to prevent exceptions when using NFS mounts ([#6566](https://github.com/bundler/bundler/issues/6566), @colby-swandale)
  - Respect encodings when reading gemspecs ([#6598](https://github.com/bundler/bundler/issues/6598), @deivid-rodriguez)

Documentation:

  - Fix links between manual pages (@BanzaiMan)
  - Add warning to Gemfile documentation for the use of the `source` option when declaring gems ([#6280](https://github.com/bundler/bundler/issues/6280), @forestgagnon)

## 1.16.2 (2018-04-20)

Changes:

  - Include the gem's source in the gem install error message when available (@papanikge)
  - Remove unnecessary executable bit from gem template (@voxik)
  - Dont add the timestamp comment with gems added to the Gemfile via `bundle add` ([#6193](https://github.com/bundler/bundler/issues/6193), @cpgo)
  - Improve yanked gem error message (@alyssais)
  - Use `Bundler.rubygems.inflate` instead of the Gem::Util method directly (@segiddins)
  - Remove unused instance variable (@segiddins)

Bugfixes:

  - Only trap INT signal and have Ruby's signal default handler be invoked (@shayonj)
  - Fix warning about the use of `__FILE__` in RubyGems integration testing (@MSP-Greg)
  - Skip the outdated bundler check when MD5 is not available ([#6032](https://github.com/bundler/bundler/issues/6032), @segiddins)
  - Fallback to the original error if the friendly message raises (@segiddins)
  - Rename Bundler.frozen? to avoid Object method conflict ([#6252](https://github.com/bundler/bundler/issues/6252), @segiddins)
  - Ensure the bindir exists before installing gems (@segiddins)
  - Handle gzip corruption errors in the compact index client ([#6261](https://github.com/bundler/bundler/issues/6261), @colby-swandale)
  - Check if the current directory is writeable when writing files in `bundle gem` ([#6219](https://github.com/bundler/bundler/issues/6219), @nilsding)
  - Fix hang when gemspec has incompatible encoding (@deivid-rodriguez)
  - Gracefully handle when the lockfile is missing spec entries for the current platform ([#6079](https://github.com/bundler/bundler/issues/6079), @segiddins)
  - Use Gem::Util.inflate instead of Gem.inflate (@hsbt)
  - Update binstub generator to use new ERB.new arity in Ruby 2.6 (@koic)
  - Fix `source_location` call in rubygems integration (@MSP-Greg)
  - Use `filesystem_access` when copying files in Compact Index Updater ([#6289](https://github.com/bundler/bundler/issues/6289), @segiddins)
  - Fail gracefully when resetting git gems to the given revision fails ([#6324](https://github.com/bundler/bundler/issues/6324), @segiddins)
  - Handle exceptions that do not have a backtrace ([#6342](https://github.com/bundler/bundler/issues/6342), @nesaulov)
  - Check if stderr was closed before writing to it (@shime)
  - Handle updating a specific gem for a non-local platform ([#6350](https://github.com/bundler/bundler/issues/6350), @greysteil)
  - Bump the `bundle_binstub` check-length to 300 characters (@tduffield)
  - Fix specifying alterntive Lockfile with `bundle lock` when default gemfile is present  ([#6460](https://github.com/bundler/bundler/issues/6460), @agrim123)
  - Allow installing dependencies when the path is set to `.`  ([#6475](https://github.com/bundler/bundler/issues/6475), @segiddins)
  - Support Bundler installing on a readonly filesystem without a home directory ([#6461](https://github.com/bundler/bundler/issues/6461), @grosser)
  - Filter git uri credentials in source description (@segiddins)

Documentation:

  - Correct typos in `bundle binstubs` man page (@erikj, @samueloph)
  - Update links in `bundle gem` command documentation to use https (@KrauseFx)
  - Fix broken links between bundler man pages (@segiddins)
  - Add man page for the `bundle doctor` command ([#6243](https://github.com/bundler/bundler/issues/6243), @nholden)
  - Document `# frozen_string_literal` in `bundle init` Gemfile (@315tky)
  - Explain the gemspec files attribute in `bundle gem` template and print a link to bundler.io guides when running `bundle gem` ([#6246](https://github.com/bundler/bundler/issues/6246), @nesaulov)
  - Small copy tweaks & removed redundant phrasing in the bundler man page (@rubymorillo)
  - Improve the documentation of the settings load order in Bundler (@rubymorillo)
  - Added license info to main README (@rubymorillo)
  - Document parameters and return value of Injector#inject (@tobias-grasse)

## 1.16.1 (2017-12-12)

Bugfixes:

  - avoid hanging on complex resolver errors ([#6114](https://github.com/bundler/bundler/issues/6114), @halfbyte)
  - avoid an error when running `bundle update --group` ([#6156](https://github.com/bundler/bundler/issues/6156), @mattbrictson)
  - ensure the resolver prefers non-pre-release gems when possible ([#6181](https://github.com/bundler/bundler/issues/6181), @greysteil)
  - include bundler's gemspec in the built gem ([#6165](https://github.com/bundler/bundler/issues/6165), @dr-itz)
  - ensure locally installed specs are not overriden by those in remote sources during dependency resolution ([#6072](https://github.com/bundler/bundler/issues/6072), @indirect)
  - ensure custom gemfiles are respected in generated binstubs (@pftg)
  - fail gracefully when loading a bundler-generated binstub when `bin/bundle` was not generated by bundler ([#6149](https://github.com/bundler/bundler/issues/6149), @hsbt)
  - allow `bundle init` to be run even when a parent directory contains a gemfile ([#6205](https://github.com/bundler/bundler/issues/6205), @colby-swandale)

## 1.16.0 (2017-10-31)

Bugfixes:

  - avoid new RubyGems warning about unsafe YAML loading (to keep output consistent) (@segiddins)
  - load digest subclasses in a thread-safe manner (@segiddins, @colby-swandale)
  - avoid unusued variable warnings under ruby 2.5 (@amatsuda)
  - fix printing the same message twice in verbose mode ([#6028](https://github.com/bundler/bundler/issues/6028), @akhramov)
  - allow `SignalException`s to bubble up to the interpreter during `bundle exec` ([#6090](https://github.com/bundler/bundler/issues/6090), @dekellum)
  - avoid activating stdlib digest under Ruby 2.5 (@segiddins)
  - prioritise explicitly requested gems in dependency resolution sort order (@segiddins)
  - reduce memory usage during dependency resolution ([#6114](https://github.com/bundler/bundler/issues/6114), @greysteil)
  - ensure that the default bundler gem is not accidentally activated on ruby 2.5 when using local git overrides (@segiddins)

## 1.16.0.pre.3 (2017-10-04)

Features:

  - the output from `bundle env` includes more information, particularly both the compiled & loaded versions of OpenSSL (@indirect)

Bugfixes:

  - fix a bug where installing on FreeBSD would accidentally raise an error (#6013, @olleolleolle)
  - fix a regression in 1.16 where pre-release gems could accidentally be resolved even when the gemfile contained no pre-release requirements (@greysteil)
  - bundler will avoid making unnecessary network requests to fetch dependency data, fixing a regression introduced in 1.16 (@segiddins)
  - the outdated bundler version message is disabled by default until the message has been fine-tuned (#6004, @segiddins)

## 1.16.0.pre.2 (2017-09-06)

Bugfixes:

  - handle when a connection is missing a socket when warning about OpenSSL version (@greysteil)
  - the description for the `rake release` task now reflects `$RUBYGEMS_HOST` (@wadetandy)
  - fix a bug where `bundle update` would regress transitive dependencies (@greysteil)

## 1.16.0.pre.1 (2017-09-04)

Features:

  - allow using non-branch symbolic refs in a git source (#4845, @segiddins)
  - allow absolute paths in the `cache path` setting (#5627, @mal)
  - gems created via `bundle gem` with rspec have `--require spec_helper` in their `.rspec` file (@koic)
  - `bundle env` includes `Gem.ruby` and the `bundle` binstub shebang when they don't match (#5616, @segiddins)
  - allow passing gem names to `bundle pristine` (@segiddins)
  - `bundle version` and `bundle env` include the commit and build date for the bundler gem (#5049, @segiddins)
  - add the `--shebang` option to `bundle binstubs` (#4070, @segiddins, @Zorbash)
  - gemfiles are `eval`ed one fewer time when running `bundle install` (#4952, #3096, #4417, @segiddins)
  - the `fileutils` gem is now vendored so different versions of the gem can be activated (@segiddins)
  - speed up no-op installations (#5842, @segiddins)
  - default to keeping the lockfile in the default gem template (@deivid-rodriguez)
  - add a special bundler binstub that ensures the correct version of bundler is activated (#5876, @segiddins)
  - speed up dependency resolution and ensure that all resolvable gemfiles can be installed (@segiddins, @greysteil)
  - add a `bundle list` command that prints the gems in use (#4754, @colby-swandale)
  - allow adding credentials to a gem source during deployment when `allow_deployment_source_credential_changes` is set (@adrian-gomez)
  - making an outdated (and insecure) TLS connection to rubygems.org will print a warning (@segiddins)

Bugfixes:

  - allow configuring a mirror fallback timeout without a trailing slash (#4830, @segiddins)
  - fix handling of mirrors for file: urls that contain upper-case characters (@segiddins)
  - list the correct gem host for `rake release` when `allowed_push_host` has been set (@mdeering)
  - ensure `Bundler.original_env` preserves all env keys that bundler sets (#5700, @segiddins)
  - ensure `bundle pristine` removes files added to a git gem (@segiddins)
  - load plugin files from path gems before gem installation (#5429, @segiddins)
  - ensure gems containing manpages are properly set up (#5730, @segiddins)
  - avoid fetching remote specs when all effected gems are in groups that are not being installed (@segiddins)
  - allow `BUNDLE_GEMFILE` to be a relative path (#5712, @gxespino)
  - show a more helpful error message when a gem fails to install due to a corrupted lockfile (#5846, @segiddins)
  - add a process lock to allow multiple concurrent `bundle install`s (#5851, @stefansedich)
  - ensure that specifications always return an array for `#extensions` (@greysteil)
  - print a helpful error message when using a gem in the Gemfile with an empty name (@colby-swandale)
  - ensure that all gemfiles are included in `bundle env` (@segiddins)
  - use ssl client cert and ca cert settings from gem configuration as fallbacks (@stan3)
  - avoid global namespace pollution when loading gems (#5958, @shyouhei)
  - avoid running a complete re-resolve on `bundle update --bundler` (@segiddins)
  - allow `bundle binstubs --standalone` to work without `path` being set (@colby-swandale)
  - fix support for bundle paths that include jars or wars on jruby (#5975, @torcido)

## 1.15.4 (2017-08-19)

Bugfixes:

  - handle file conflicts gracefully in `bundle gem` (@rafaelfranca, @segiddins)
  - bundler will fail gracefully when the bundle path contains the system path separator (#5485, ajwann)
  - failed gem downloads will be retried consistently across different RubyGems versions (@shayonj)
  - `bundle pristine` will respect build options while re-building native extensions (@NickLaMuro)

## 1.15.3 (2017-07-21)

Bugfixes:

  - ensure that empty strings passed to `bundle config` are serialized & parsed properly (#5881, @segiddins)
  - avoid printing an outdated version warning when running a parseable command (@segiddins)

## 1.15.2 (2017-07-17)

Features:

  - new gemfiles created by bundler will include an explicit `github` git source that uses `https` (@segiddins)

Bugfixes:

  - inline gemfiles work when `BUNDLE_BIN` is set (#5847, @segiddins)
  - avoid using the old dependency API when there are no changes to the compact index files (#5373, @greysteil)
  - fail gracefully when the full index serves gemspecs with invalid dependencies (#5797, @segiddins)
  - support installing gemfiles that use `eval_gemfile`, `:path` gems with relative paths, and `--deployment` simultaneously (@NickLaMuro)
  - `bundle config` will print settings as the type they are interpreted as (@segiddins)
  - respect the `no_proxy` environment variable when making network requests (#5781, @jakauppila)
  - commands invoked with `--verbose` will not have default flags printed (@segiddins)
  - allow `bundle viz` to work when another gem has a requirable `grapviz` file (#5707, @segiddins)
  - ensure bundler puts activated gems on the `$LOAD_PATH` in a consistent order (#5696, @segiddins)

## 1.15.1 (2017-06-02)

Bugfixes:

  - `bundle lock --update GEM` will fail gracefully when the gem is not in the lockfile (#5693, @segiddins)
  - `bundle init --gemspec` will fail gracefully when the gemspec is invalid (@colby-swandale)
  - `bundle install --force` works when the gemfile contains git gems (#5678, @segiddins)
  - `bundle env` will print well-formed markdown when there are no settings (#5677, @segiddins)

## 1.15.0 (2017-05-19)

This space intentionally left blank.

## 1.15.0.pre.4 (2017-05-10)

Bugfixes:

  - avoid conflicts when `Gem.finish_resolve` is called after the bundle has been set up (@segiddins)
  - ensure that `Gem::Specification.find_by_name` always returns an object that can have `#to_spec` called on it (#5592, @jules2689)

## 1.15.0.pre.3 (2017-04-30)

Bugfixes:

  - avoid redundant blank lines in the readme generated by `bundle gem` (@koic)
  - ensure that `open-uri` is not loaded after `bundle exec` (@segiddins)
  - print a helpful error message when an activated default gem conflicts with
    a gem in the gemfile (@segiddins)
  - only shorten `ref` option for git gems when it is a SHA (#5620, @segiddins)

## 1.15.0.pre.2 (2017-04-23)

Bugfixes:

  - ensure pre-existing fit caches are updated from remote sources (#5423, @alextaylor000)
  - avoid duplicating specs in the lockfile after updating with the gem uninstalled (#5599, @segiddins)
  - ensure git gems have their extensions available at runtime (#5594, @jules2689, @segiddins)

## 1.15.0.pre.1 (2017-04-16)

Features:

  - print a notification when a newer version of bundler is available (#4683, @segiddins)
  - add man pages for all bundler commands (#4988, @feministy)
  - add the `bundle info` command (@fredrb, @colby-swandale)
  - all files created with `bundle gem` comply with the bundler style guide (@zachahn)
  - if installing a gem fails, print out the reason the gem needed to be installed (#5078, @segiddins)
  - allow setting `gem.push_key` to set the key used when running `rake release` (@DTrierweiler)
  - print gem versions that are regressing during `bundle update` in yellow (#5506, @brchristian)
  - avoid printing extraneous dependencies when the resolver encounters a conflict (@segiddins)
  - add the `bundle issue` command that prints instructions for reporting issues (#4871, @jonathanpike)
  - add `--source` and `--group` options to the `bundle inject` command (#5452, @Shekharrajak)
  - add the `bundle add` command to add a gem to the gemfile (@denniss)
  - add the `bundle pristine` command to re-install gems from cached `.gem` files (#4509, @denniss)
  - add a `--parseable` option for `bundle config` (@JuanitoFatas, @colby-swandale)

Performance:

  - speed up gemfile initialization by storing locked dependencies as a hash (@jules2689)
  - speed up gemfile initialization by making locked dependency comparison lazy, avoiding object allocation (@jules2689)
  - only validate git gems when they are downloaded, instead of every time `Bundler.setup` is run (@segiddins)
  - avoid regenerating the lockfile when nothing has changed (@segiddins)
  - avoid diffing large arrays when no sources in the gemfile have changed (@segiddins)
  - avoid evaluating full gemspecs when running with RubyGems 2.5+ (@segiddins)

Bugfixes:

  - fix cases where `bundle update` would print a resolver conflict instead of updating the selected gems (#5031, #5095, @segiddins)
  - print out a stack trace after an interrupt when running in debug mode (@segiddins)
  - print out when bundler starts fetching a gem from a remote server (@segiddins)
  - fix `bundle gem` failing when `git` is unavailable (#5458, @Shekharrajak, @colby-swandale)
  - suggest the appropriate command to unfreeze a bundle (#5009, @denniss)
  - ensure nested calls to `bundle exec` resolve default gems correctly (#5500, @segiddins)
  - ensure that a plugin failing to install doesn't uninstall other plugins (@kerrizor, @roseaboveit)
  - ensure `socket` is required before being referenced (#5533, @rafaelfranca)
  - allow running `bundle outdated` when gems aren't installed locally (#5553, @segiddins)
  - print a helpful error when `bundle exec`ing to a gem that isn't included in the bundle (#5487, @segiddins)
  - print an error message when a non-git gem is given a `branch` option (#5530, @colby-swandale)
  - allow interrupts to exit the process after gems have been installed (@segiddins)
  - print the underlying error when downloading gem metadata fails (#5579, @segiddins)
  - avoid deadlocking when installing with a lockfile that is missing dependencies (#5378, #5480, #5519, #5526, #5529, #5549, #5572, @segiddins)

## 1.14.6 (2017-03-03)

Bugfixes:

  - avoid undefined constant `Bundler::Plugin::API::Source` exception (#5409, @segiddins)
  - avoid incorrect warnings about needing to enable `specific_platform` (@segiddins)
  - fail gracefully when the compact index does not send an ETag (#5463, @olleolleolle)
  - ensure `bundle outdated --local` shows all outdated gems (#5430, @denniss)
  - fix a case where ruby version requirements could lead to incorrect resolver conflicts (#5425, @segiddins)

## 1.14.5 (2017-02-22)

Bugfixes:

  - avoid loading all unused gemspecs during `bundle exec` on RubyGems 2.3+ (@segiddins)
  - improve resolver performance when dependencies have zero or one total possibilities ignoring requirements (#5444, #5457, @segiddins)
  - enable compact index when OpenSSL FIPS mode is enabled but not active (#5433, @wjordan)
  - use github username instead of git name for the github url in `bundle gem` (#5438, @danielpclark)
  - avoid a TypeError on RubyGems 2.6.8 when no build settings are set for native extensions (@okkez)
  - fail gracefully when the dependency api is missing runtime dependencies for a gem (@segiddins)
  - handle when a platform-specific gem has more dependencies than the ruby platform version (#5339, #5426, @segiddins)
  - allow running bundler on a machine with no home directory where the temporary directory is not writable (#5371, @segiddins)
  - avoid gem version conflicts on openssl using Ruby 2.5 (#5235, @rhenium)
  - fail when installing in frozen mode and the dependencies for `gemspec` gems have changed without the lockfile being updated (#5264, @segiddins)

## 1.14.4 (2017-02-12)

Bugfixes:

  - fail gracefully when attempting to overwrite an existing directory with `bundle gem` (#5358, @nodo)
  - fix a resolver bug that would cause bundler to report conflicts that it could resolve (#5359, #5362, @segiddins)
  - set native extension build arguments for git gems (#5401, @segiddins)
  - fix the suggested `bundle lock` command printed when a dependency is unused on any platform (@5t111111)
  - ensure the version passed to `ruby` in the Gemfile is valid during Gemfile parsing (#5380, @segiddins)
  - show `bundle inject` usage when too many arguments are passed (#5384, @Shekharrajak)
  - stop `bundle show --outdated` from implicitly running `bundle update` (#5375, @colby-swandale)
  - allow the temporary home directory fallback to work for multiple users (@svoop)

## 1.14.3 (2017-01-24)

Bugfixes:

  - fix the resolver attempting to activate ruby-platform gems when the bundle is only for other platforms (#5349, #5356, @segiddins)
  - avoid re-resolving a locked gemfile that uses `gemspec` and includes development dependencies (#5349, @segiddins)

## 1.14.2 (2017-01-22)

Bugfixes:

  - fix using `force_ruby_platform` on windows (#5344, @segiddins)
  - fix an incorrect version conflict error when using `gemspec` on multiple platforms (#5340, @segiddins)

## 1.14.1 (2017-01-21)

Bugfixes:

  - work around a ruby 2.2.2 bug that caused a stack consistency error during installation (#5342, @segiddins)

## 1.14.0 (2017-01-20)

Bugfixes:

  - ensure `Settings::Mirror` is autoloaded under the `Settings` namespace
    (#5238, @segiddins)
  - fix `bundler/inline` when `BUNDLE_GEMFILE=""` (#5079, @segiddins)

## 1.14.0.pre.2 (2017-01-11)

Bugfixes:

  - allow not selecting a gem when running `bundle open` (#5301, @segiddins)
  - support installing gems from git branches that contain shell metacharacters (#5295, @segiddins)
  - fix a resolver error that could leave dependencies unresolved (#5294, @segiddins)
  - fix a stack overflow error when invoking commands (#5296, @segiddins)

## 1.14.0.pre.1 (2016-12-29)

Features:

  - `bundle doctor` first runs `bundle check` (@segiddins)
  - the bundler trampoline is automatically enabled when the target version is greater than bundler 2 (@segiddins)
  - gem checksums returned by rubygems.org are validated when installing gems (#4464, @segiddins)
  - use the git username as a github username when running `bundle gem` (@JuanitoFatas)
  - show more context when the resolver conflicts on required ruby and rubygems versions (@segiddins)
  - improve platform support by allowing bundler to pick the best platform match during dependency resolution, enabled with the `specific_platform` setting (#4295, #4896, @segiddins)
  - always prompt the user for a password when using `sudo` (#3006, @segiddins)
  - support running without a home directory (#4778, @segiddins)
  - print a warning when the gemfile uses a platform conditional that will exclude the gem from all lockfile platforms (@segiddins)
  - add the `force_ruby_platform` setting to force bundler to install ruby-platform gems, even on other platforms (#4813, @segiddins)
  - add conservative update options to `bundle lock` (#4912, @chrismo)
  - improve `bundle outdated` output to group gems by group (@ryanfox1985)
  - add conservative update options to `bundle update` (#5065, #5076, @chrismo)
  - print the output of `bundle env` as github-flavored markdown, making it easier to preserve formatting when copy-pasting into a new issue (@segiddins)
  - configure the persistence file when using `bundle gem` with `rspec` (@segiddins)
  - add support for the `ruby_25` gemfile filter (@amatsuda)
  - when installing with a lockfile that is missing dependencies, allow installation to proceed (but without parallelism) (@segiddins)

Performance:

  - improve `require "bundler"` performance by ~5x (@segiddins)
  - allow install gems in parallel when running on rubygems 2+

Bugfixes:

  - config files with CRLF line endings can be read (#4435, @segiddins)
  - `bundle lock` activates gems for the current platform even if they were activated under a different platform for a separate dependency (#4896, @segiddins)
  - running `bundle env` in a directory without a gemfile no longer crashes (@segiddins)
  - fail gracefully when attempting to use a source with an unknown URI scheme (#4953, @segiddins)
  - store paths in the lockfile relative to the root gemfile directory when using `eval_gemfile` (#4966, @segiddins)
  - `bundle lock` will not update without the `--update` flag (#4957, @segiddins)
  - the `console` binstub generated by `bundle gem` will load `.irbrc` files (@mattbrictson)
  - print friendly filesystem access errors in the new index (@segiddins)
  - print a helpful error when running out of memory on jruby (#4673, @segiddins)
  - load all rubygems plugins when installing gems (#2824, @segiddins)
  - `bundle clean --dry-run` prints the list of gems without the `--force` option when no path is set (#5027, @hmistry)
  - local installs no longer print "this gem may have been yanked" (#5022, @hmistry)
  - avoid leaking `which` output when running `bundle doctor` (@colby-swandale)
  - print a warning when attempting to `bundle exec` an empty program (#5084, @bronzdoc)
  - ensure `bundle outdated` lists all outdated gems (#4979, @chrismo)
  - fail gracefully when attempting to `bundle gem` with an invalid constant name (#5185, @segiddins)
  - allow `bundler/inline` to work in a directory that contains a gemfile (#5117, @colby-swandale)
  - ensure that the new index is thread-safe, allowing installation on rbx (#5142, @segiddins)
  - remove deprecated `rspec` syntax in `bundle gem` output (@gearnode)
    - fail gracefully when any system error is encountered when touching the filesystem (#5134, @segiddins)
  - fix compatibility with a machine running with FIPS mode enabled (#4989, @segiddins)
  - fix `bundle lock --add-platform ruby` (#5230, @segiddins)
  - print gem post-install messages when running `bundle update` (@smathy)
  - ensure errors due to a retries are all separated by a newline (@segiddins)
  - print out the bundle path in gem not found errors (#4854, @diegosteiner)
  - fail gracefully when creating threads fails (@segiddins)
  - avoid downloading metadata for gems that are only development dependencies (@Paxa)

## 1.13.7 (2016-12-25)

Features:

  - add support for the `ruby_24` gemfile filter (#5281, @amatsuda)

## 1.13.6 (2016-10-22)

Bugfixes:

  - make the `gem` method public again, fixing a regression in 1.13.4 (#5102, @segiddins)

## 1.13.5 (2016-10-15)

Bugfixes:

  - Ensure a locked pre-release spec can always be re-resolved (#5089, @segiddins)

## 1.13.4 (2016-10-11)

Bugfixes:

 - stop printing warning when compact index versions file is rewritten (#5064, @indirect)
 - fix `parent directory is world writable but not sticky` error on install (#5043, @indirect)
 - fix for `uninitialized constant Bundler::Plugin::API::Source` error (#5010, @hsbt, @aycabta)
 - make `update` options for major, minor, and patch updates consistent (#4934, @chrismo)

## 1.13.3 (2016-10-10)

Bugfixes:

  - add support for weak etags to the new index (@segiddins)

## 1.13.2 (2016-09-30)

Bugfixes:

  - allow `Settings` to be initialized without a root directory (@m1k3)
  - allow specifying ruby engines in the gemfile as a symbol (#4919, @JuanitoFatas)
  - avoid an exception when using `bundler/deployment` with Vlad (@srbaker)
  - ensure redefined methods have the same visibility as the one they're replacing, fixing `Kernel.require` failing on JRuby (#4975, @segiddins)
  - ensure that Bundler won't complain about a corrupt lockfile when no lockfile exists when using `gemspec` in the Gemfile (#5006, @segiddins)
  - fail gracefully when parsing the metadata for a gemspec from the compact index fails (@segiddins)
  - fix system gems not being copied to --path on bundle install (e.g. --deployment) (#4974, @chrismo)

Performance:

  - avoid parsing the lockfile twice when evaluating gemfiles (@segiddins)

## 1.13.1 (2016-09-13)

Bugfixes:

  - ensure that `Gem::Source` is available, fixing several exceptions (#4944, @dekellum)
  - ensure that dependency resolution works when multiple gems have the same dependency (#4961, @segiddins)

## 1.13.0 (2016-09-05)

This space deliberately left blank.

## 1.13.0.rc.2 (2016-08-21)

Features:

  - add setting `exec_disable_load` to force `exec` to spawn a new Ruby process (@segiddins)
  - add `doctor` command to help with issues like unlinked compiled gems (#4765, @mistydemeo)
  - rework the `update` command, providing fine-grained control via flags (#4676, @chrismo)
  - add URI to http response output in debug mode (#4808, @NickLaMuro)
  - add manpage for `binstubs` command (#4847, @Zorbash)
  - support `mirror` settings for sources by hostname, not only full URL (@opiethehokie)
  - print gem installation errors after other install output (#4834, @segiddins)
  - add `lock --remove-platform` flag to remove platforms from the lock (#4877, @segiddins)
  - add `only_update_to_newer_versions` setting to prevent downgrades during `update` (@segiddins)
  - expanded experimental plugin support to include hooks and sources (@asutoshpalai)

Bugfixes:

  - retry gem downloads (#4846, @jkeiser)
  - improve the CompactIndex to handle capitalized legacy gems (#4867, @segiddins)
  - re-use persistent HTTP connections for CompactIndex (@NickLaMuro)
  - respect `required_ruby_version` when Gemfile contains `ruby` version (@indirect)
  - allow `rake release` to sign git tags (#4743, @eagletmt)
  - set process titles when using `#load` during `exec` (@yob)
  - recognize JRuby shebangs for using `#load` during `exec` (@ojab)
  - handle world-writable home directories (#4726, @allenzhao)
  - support multi-platform gems via the `gemspec` Gemfile method (#4798, @segiddins)
  - print dots correctly for CompactIndex fetcher (@NickLaMuro)
  - set an `open_timeout` when requesting gem data via HTTP (@NickLaMuro)
  - rename the BUNDLE\_ORIG\_ENV variable so it no longer shows up in `config` (@indirect)
  - show help only when `-h` or `--help` is passed to Bundler, not to `exec` (#4801, @segiddins)
  - handle symlinks to binstubs created by `--standalone` (#4782, @terinjokes)

## 1.13.0.rc.1 (2016-06-27)

Features:

  - when `bundle config major_deprecations` or `BUNDLE_MAJOR_DEPRECATIONS` is set, deprecation warnings for bundler 2 will be printed (@segiddins)
  - when running with `--verbose`, bundler will print the reason it is re-resolving a gemfile (@segiddins)

Bugfixes:

  - fix support for running RubyGems 1.x on Ruby 2.3 (#4698, @segiddins)
  - fix bundle exec'ing to a ruby file when gems are installed into a path (#4592, @chrismo)
  - when multiple specs in a bundle have the same executable, prefer activating the one from the requested gem (#4705, @segiddins)
  - stop changing the load path to require the vendored postit when trampolining (@segiddins)
  - ensure relative paths are properly printed after completing an installation (@jenseng)
  - fix re-resolving when there are multiple unchanged path sources (@segiddins)
  - de-init submodules when running git 2.9 and requesting a git gem without submodules (@segiddins)

## 1.13.0.pre.1 (2016-06-20)

Performance:

  - speed up gemfile resolution during `bundle install` by between 4x-100x (#4376, @segiddins)
  - generally reduce object allocations when using bundler (@segiddins)
  - speed up bin generation for path gems with many files (#2846, @segiddins)
  - fix detecting path spec changes to avoid re-resolving unnecessarily (@jrafanie)

Features:

  - automatically trampoline to the bundler version locked in the lockfile, only updating to the running version on `bundle update --bundler` (@segiddins)
  - laying the groundwork for plugin support, which is currently unsuppported, undocumented, disabled by default, and liable to change without notice (@asutoshpalai)
  - allow `bundle viz --without` to accept multiple `:`-delimited groups (@mobilutz)
  - support for RubyGems 2.6.4 (#4368, @segiddins, @RochesterinNYC)
  - colorize updated gem versions (#4334, @bronzdoc)
  - add the `--standalone` flag to `bundle binstubs` (#4594, @b-ggs)
  - update the `bundle gem` CoC to contributor covenant v1.4 (@cllns)
  - use a custom YAML serializer to make config file consistent (@segiddins)
  - filter credentials from error messages (bundler/bundler-features#111, @RochesterinNYC, @sandlerr)
  - support relative paths used inside a nested invocation of `eval_gemfile` (#4584, @RochesterinNYC)
  - fail gracefully when attempting to install a yanked gem (#4344, @allenzhao)
  - automatically install an inline gemfile when gems are missing locally (@segiddins)
  - allow conflicts for gems resolved via `gemspec` (@segiddins)
  - add `--add-platform` option to `bundle lock` (@segiddins)
  - fail gracefully when a resolved spec's `required_ruby_version` or `required_rubygems_version` is incompatible (@segiddins)

Bugfixes:

  - implicitly unlock the resolved ruby version when the declared requirements in the gemfile are incompatible with the locked version (#4595, #4627, @segiddins)
  - add support for quoted paths in `$PATH` (#4323, @segiddins)
  - check out missing git repos that are not being installed (#3981, @asutoshpalai)
  - write `bundler/setup.rb` to a consistent path (@glennpratt)
  - open editor in `bundle open` with a clean environment (@sj26)
  - resolve infinitely recursive copy when running `bundle package --all` with a `gemspec` in the gemfile (#4392, #4430, @RochesterinNYC)
  - fail gracefully when encountering an `Errno::ENOTSUP` (#4394, @segiddins)
  - fail gracefully when encountering an `Errno::EHOSTUNREACH` (#4642, @allenzhao)
  - fix loading config files with very long values (#4370, @segiddins)
  - only show potential updates for gemfile platforms in `bundle outdated` (#4450, @RochesterinNYC)
  - allow running `bundle install --deployment` after `bundle package --all` with path gems (#2175, @allenzhao)
  - add support for patchlevels in ruby versions in the gemfile and gemspecs (#4593, @chalkos)

## 1.12.6 (2016-10-10)

Bugfixes:
  - add support for weak etags to the new index (@segiddins)

## 1.12.5 (2016-05-25)

Bugfixes:
  - only take over `--help` on `bundle exec` when the first two arguments are `exec` and `--help` (#4596, @segiddins)
  - don't require `require: true` dependencies that are excluded via `env` or `install_if` (@BrianHawley)
  - reduce the number of threads used simultaneously by bundler (#4367, @will-in-wi)

## 1.12.4 (2016-05-16)

Bugfixes:
  - ensure concurrent use of the new index can't corrupt the cache (#4519, @domcleal)
  - allow missing rubygems credentials when pushing a gem with a custom host (#4437, @Cohen-Carlisle)
  - fix installing built-in specs with `--standalone` (#4557, @segiddins)
  - fix `bundle show` when a gem has a prerelease version that includes a `-` (#4385, @segiddins)

## 1.12.3 (2016-05-06)

Bugfixes:
  - fix uncoditionally writing `.bundle/config` when running `bundle install` (@segiddins)
  - fall back to the dependency API and the full index when the home directory is not writable (@segiddins)

## 1.12.2 (2016-05-04)

Bugfixes:
  - fix modifying a frozen string when the resolver conflicts on dependencies with requirements (#4520, @grzuy)
  - fix `bundle exec foo --help` not showing the invoked command's help (#4480, @b-ggs)

## 1.12.1 (2016-04-30)

Bugfixes:
  - automatically fallback when the new index has a checksum mismatch instead of erroring (@segiddins)
  - fix computation of new index file local checksums on Windows (#4472, @mwrock)
  - properly handle certain resolver backtracking cases without erroring (@segiddins, #4484)
  - ensure the `$LOAD_PATH` contains specs' load paths in the correct order (@segiddins, #4482)

## 1.12.0 (2016-04-28)

This space intentionally left blank.

## 1.12.0.rc.4 (2016-04-21)

Bugfixes:

  - don't fail when `bundle outdated` is run with flags and the lockfile contains non-semver versions (#4438, @RochesterinNYC)

## 1.12.0.rc.3 (2016-04-19)

Bugfixes:

  - don't allow new attributes to dirty a lockfile when running `bundle exec`, `-rbundler/setup`, or `bundle check` (@segiddins)

## 1.12.0.rc.2 (2016-04-15)

Features:

  - `bundle outdated` handles all combinations of `--major`, `--minor`, and `--patch` (#4396, @RochesterinNYC)

Bugfixes:

  - prevent endless recursive copy for `bundle package --all` (#4392, @RochesterinNYC)
  - allow executables that are `load`ed to exit non-0 via an `at_exit` hook when invoked by `bundle exec` (@segiddins)
  - nested invocations of `bundle exec` properly preserve the `$PATH` and `$GEM_PATH` environment variables (@segiddins)

## 1.12.0.rc (2016-03-13)

Performance:

  - Download gem metadata from globally distributed CDN endpoints (#4358, @segiddins)

Bugfixes:

  - handle Ruby pre-releases built from source (#4324, @RochesterinNYC)
  - support binstubs from RubyGems 2.6 (#4341, @segiddins)
  - handle quotes present in in PATH (#4326, @segiddins)

## 1.12.0.pre.2 (2016-02-26)

Performance:

  - speed up `bundle exec` by `load`ing the executable whenever possible, saving roughly .2 seconds per invocation (@segiddins)

Features:

  - add a `--patch` flag for `bundle outdated` (@RochesterinNYC)
  - add `Bundler.clean_env` and `Bundler.original_env` (#4232, @njam)
  - add `--frozen` support to `bundle package` (#3356, @RochesterinNYC)

Bugfixes:

  - place bundler loaded gems after `-I` and `RUBYLIB` (@Elffers)
  - give a better error message when filesystem access raises an `EPROTO` error (#3581, #3932, #4163, @RochesterinNYC)
  - give a better error message when both `--deployment` and `--system` are used together (@RochesterinNYC)
  - fix `$PATH` being preserved for use in `Bundler.with_clean_env` (#4251, @segiddins, @njam)
  - give a better error message when running `bundle outdated` in frozen mode (#4287, @RochesterinNYC)
  - handle when `http_proxy` is set to `:no_proxy` in the rubygems configuration (#4294, @segiddins)
  - give a better error message when authentication details aren't properly escaped (#4288, @RochesterinNYC)
  - fix `bundle outdated --minor` to only report updates that match the current minor version (@RochesterinNYC)
  - fix extra dependencies being resolved unnecessarily (#4276, @segiddins)
  - give a better error message when missing specs due to platform mis-matches (#4259, @RochesterinNYC)
  - skip rebuilding extensions for git gems if they are already built (#4082, @csfrancis, @indirect, @segiddins)
  - fix `bundle install` not installing when the `no_install` setting is set (#3966, @chulkilee, @segiddins)

## 1.12.0.pre.1 (2016-02-09)

Performance:

  - speed up `bundle install` and `bundle update` by using the new compact gem index (@segiddins, @fotanus, @indirect)
  - speed up `bundle exec` by avoiding loading the gemfile twice (#2951, #2952, @segiddins)

Features:

  - add support for using version operators to specify ruby versions in the Gemfile (@jtarchie)
  - redirect `--help` flag for plugins to that plugin's man page (@RochesterinNYC)
  - support probing a mirror with a fallback timeout (#4128, @pcarranza)
  - add `--full-index` option to `bundle lock` (@segiddins)
  - support running with frozen string literals (@deepj, @segiddins)
  - add `--major` and `--minor` options to `bundle outdated` (#3805, @cirdes)
  - allow passing a custom `ui` to `bundler/inline` (@lamont-granquist)
  - add support for ruby 2.4 (#4266, @segiddins)
  - add `bundle outdated --parseable` for machine-readable output (@RochesterinNYC)

Bugfixes:

  - fix `bundle package --all` recursing endlessly (#4158, @RochesterinNYC)
  - fail fast on more errors when fetching remote resources (#4154, @RochesterinNYC)
  - give a better error message when a given git commit can't be found (#4140, @doy)
  - give a better error message when `bundle clean` doesn't have sufficient permissions (#4170, @RochesterinNYC)
  - give a better error message when reading a bundler config file fails (@segiddins)
  - restrict platforms when referencing a `gemspec` in the `Gemfile` to those defined in the gemspec (#4102, #4150, @smellsblue)
  - fix `bundle gem` with minitest to use the correct rake task (@kotoshenya)
  - give a better error message when ssl isn't available (#4054, @RochesterinNYC)
  - print the original `require` error when `Bundler.require` fails (#4182, @RochesterinNYC)
  - give a better error message when certain resources are temporarily unavailable (#4183, @RochesterinNYC)
  - fix returning case-sensitive gem mirror URIs on ruby 2.3 (@segiddins)
  - ignore colorized output from `git` when determining the current branch (#4056, @agis-)
  - fix storing the shared gems config option as a boolean (@vassilevsky)
  - add support for running `bundle gem --exe` instead of using the `--bin` option (@christhekeele)
  - fix `exec`-ing with 0 args in a directory with spaces (#4230, @segiddins)
  - avoid installing extraneous gems when resolving to an older version of a spec (#4101, #4198, @segiddins)
  - ensure paths resolved when parsing a gemfile are relative to that file (#3349, @dtognazzini)
  - give a better error message when encountering an invalid gemspec (#4248, #4275, @RochesterinNYC)
  - preserve the original `PATH` in `Bundler.with_clean_env` (#4251, @segiddins)
  - ensure standalone file paths are relative to the project root (#4144, @glennpratt)

## 1.11.2 (2015-12-15)

Bugfixes:

  - _really_ stop calling `required_ruby_version` on nil @specifications (#4147, @indirect)

## 1.11.1 (2015-12-15)

Bugfixes:

  - lazy-load Psych, again (#4149, @indirect)
  - allow gemspec gems on other platforms (#4150, @indirect)
  - fix --no-coc and --no-mit flags on `gem` (#4148, @RochesterinNYC)
  - stop calling `required_ruby_version` on nil @specifications (#4147, @indirect)

## 1.11.0 (2015-12-12)

(this space intentionally left blank)

## 1.11.0.pre.2 (2015-12-06)

Bugfixes:

  - fail gracefully when trying to execute a non-executable file (#4081, @fotanus)
  - fix a crash when pushing a gem via `rake release` (@segiddins)

## 1.11.0.pre.1 (2015-11-29)

Features:

  - actual Gemfile and lockfile filenames are used in messages (#3672, @segiddins)
  - the git remote for `rake release` is now customizable (@skateman)
  - file access permissions errors are now much more friendly (#3703, #3735, #3858, #3988, #4009 @repinel, @Elffers, @segiddins, @agis-)
  - add support for showing help for plugin commands (@tf)
  - send `X-Gemfile-Source` header to source mirrors (@agis-)
  - show what version upstream dependencies were resolved to in conflict messages (@segiddins)
  - add support for using bundler setting to add private access credentials for git sources (@frsyuki)
  - take into consideration HTTP proxy settings in `.gemrc` (@PG-kura)
  - allow specifying a gem host to push to in the `GEM_HOST` environment variable (@pmenglund)
  - when gempec `required_ruby_version` is available and the Gemfile specifies a ruby version, resolve for the given ruby version (@segiddins)
  - allow setting a `silence_root_warning` setting to silence the warning when `bundle install` is run as root (@blackxored)
  - update the `bundle gem` code of conduct template to Contributor Covenant v1.3.0 (@CoralineAda)
  - add support for specifying gems to update when running `bundle lock` via `--update gem1 gem2` (@JuanitoFatas)
  - added support for MRI 2.3 (@amatsuda)
  - show a helpful message when requiring a file in `bundler require` fails (#3960, @agis-)
  - include git revision hash when printing a git source (#3433, @agis-)
  - improve hint when a resolution conflict occurs (@seanlinsley)
  - show a friendly error when a git ref is not found (#3879, @agis-)
  - improve error message when sources are not absolute URIs (#3925, @agis-)
  - add `pkg` to rake's clobber list (#3676, @jasonkarns)
  - retry fetching specs when fetching version metadata fails (@jingweno)

Bugfixes:

  - avoid showing bundler version warning messages twice (@fotanus)
  - fix running `bundle check` with `--path` when the gems are only installed globally (@akihiro17)
  - fix `bin/setup` from `bundle gem` assuming `bash` is in `/bin`
  - fail more gracefully when an HTTP remote is unreachable (#3765, @steverob)
  - fix a warning running `bundle exec` on jruby 9.0.0.0 (@deivid-rodriguez, @mastfish)
  - fix the `bundle gem` readme when no tests are generated (@roseweixel)
  - the dependencies on test gems in `bundle gem` are now locked to major versions (#3811, @indirect)
  - fix the paths for native extensions generated by `--standalone` (#3813, @AlexanderPavlenko)
  - fix trying to cache a gem that has no source (@EduardoBautista)
  - fix `--source` option to `bundle update` causing incorrect gem unlocking (#3759, #3761, @neoeno)
  - fix handling an empty `BUNDLE_GEMFILE` environment variables (#3678, @agis-)
  - avoid cleaning up gem extension directory in `bundle clean` (@Sirupsen)
  - fix the `ssl_verify_mode` setting not being treated as a number (@goughy000)
  - fix not retrying on zlib errors (#4047, @andremedeiros)
  - fix a warning being shown for using `URI.encode` (@EduardoBautista)
  - fix handling of fatal HTTP errors (#3830, @indirect)
  - ensure all `sudo` access is done in a thread-safe manner (#3910, @agis-)
  - fix caching gems with a path with the same prefix as the bundled application (@indirect)
  - fix showing gemspec validation errors on `bundle exec` (#3895, @agis-)
  - distinguish Gemfile syntax and evaluation errors (#3783, @agis-)
  - fix nested Gemfile sources not restoring the previous source (#3974, @agis-)
  - fix the `RUBYLIB` environment variable not being cleaned (#3982, @agis-)
  - fix handling a dependency missing from `Gemfile.lock` so parallel installation does not deadlock (#4012, @lukaso)
  - also print gemspecs in `bundle env` output (@agis-)
  - fix handling when a `path` source does not have a gemspec but a lockfile says there is (#4004, @segiddins)
  - show a warning when the `RUBYGEMS_GEMDEPS` environment variable is set (#3656, @agis-)
  - fix handling invalid RubyGems configuration files (#4042, @agis-)
  - fix `bundle console` falling back to `irb` when the preferred console is unavailable (@felixbuenemann)
  - restrict platforms when referencing a `gemspec` in the `Gemfile` to those defined in the gemspec (#4102, @smellsblue)

Performance:

  - speed up dependency resolution in pathological cases by 25x (#3803, @segiddins)
  - drop string allocations when searching for gems (@jrafanie)

## 1.10.6 (2015-07-22)

Workarounds:

  - only warn on invalid gemspecs (@indirect)

Bugfixes:

  - fix installing dependencies in the correct order (#3799, @pducks32)
  - fix sorting of mixed DependencyLists (#3762, @tony-spataro-rs)
  - fix `install_if` conditionals when using the block form (@danieltdt)

## 1.10.5 (2015-06-24)

Workarounds:

  - don't add or update BUNDLED WITH during `install` with no changes (@segiddins)

Bugfixes:

  - fix sorting of mixed DependencyLists with RubyGems >= 2.23 (#3762, @tony-spataro-rs)
  - speed up resolver for path and git gems (@segiddins)
  - fix `install --force` to not reinstall Bundler (#3743, @karlo57)

## 1.10.4 (2015-06-16)

Workarounds:

  - don't add BUNDLED WITH to the lock when Spring runs `check` over and over (@indirect)

Bugfixes:

  - display "with native extensions" log output correctly (@ivantsepp)
  - alias `i` to `install`, `c` to `check`, and `e` to `exec` (@indirect)

## 1.10.3 (2015-06-03)

Bugfixes:

  - allow missing gemspec files when validating path and git gems (#3686, #3698, @segiddins)
  - fix regression in `rake install` (#3701, #3705, @segiddins)
  - fix regression when calling `gem` with `bundle exec` or `-rbundler/setup` (#3699, @segiddins)
  - fix `bundler/inline` requiring a newly-installed gem (#3693, @indirect, @segiddins)

## 1.10.2 (2015-05-29)

Bugfixes:

  - fix regression in `bundle update GEM` performance introduced in 1.10.0 (#3687, @segiddins)

## 1.10.1 (2015-05-28)

Bugfixes:

  - silence ruby warning when running CLI commands (@segiddins)
  - validate gemspecs in non-packaging mode (#3681, @segiddins)
  - ensure the same chdir mutex as RubyGems is used (#3680, @segiddins)

## 1.10.0 (2015-05-28)

(this space intentionally left blank)

## 1.10.0.rc (2015-05-16)

Features:

  - dramatically speed up resolving some slow Gemfiles (#3635, @segiddins)
  - track CI platforms running Bundler (#3646, @fotanus)

Bugfixes:

  - allow `viz` to work with prereleases (#3621, #3217, @aprescott)
  - validate gemspecs used in path and git gems (#3639, @segiddins, @indirect)
  - stop printing config warnings when config is unchanged (#3649, @fotanus, @indirect)
  - Without groups saved via `config` are no longer ignored when the `--without` flag is used

## 1.10.0.pre.2 (2015-05-07)

Bugfixes:

  - make BUNDLED WITH backwards compatible (#3623, @segiddins)

## 1.10.0.pre.1 (2015-05-05)

Bugfixes:

  - always clean up tmp dirs (#3277, @hone, @indirect, @segiddins)

## 1.10.0.pre (2015-05-03)

Features:

  - support gem extensions built into any directory on RubyGems 2.2+ (#3582, @voxik)
  - add 'bundler/inline' which provides a `gemfile` method (#3440, @segiddins)
  - improved error reports for Gemfile errors (#3480, @segiddins)
  - `lock` command (#3437, @segiddins)
  - add `ignore_messages` config to suppress post-install text (#3510, @pducks32)
  - improve `gem` minitest template (#3513, #3515, @arthurnn)
  - add `install --force` to re-install installed gems (#3519, @segiddins)
  - show more `outdated` information, including groups (@smlance, @indirect)
  - add optional groups to the Gemfile (#3531, @jhass)
  - accept glob argument to `gemspec` in Gemfile (#3464, @pjump)
  - make timeouts and retries configurable via `config` (#3601, @pducks32)
  - add `install_if` Gemfile method for conditional installs (#3611, @segiddins)

Bugfixes:

  - standalone mode now uses builtin gems correctly (#3610, @segiddins)
  - fix `rake spec:deps` on MinGW Ruby 2.0+ (#3487, @marutosi)
  - remember all y/n answers when generating gems (#3579, @pducks32)

Performance:

  - use RubyGems stub specifications when possible (#3580, @segiddins)

Deprecations:

  - deprecated the (never enabled) `bundle_ruby` binary (@smlance)

## 1.9.10 (2015-06-22)

Features:

  - the `BUNDLED WITH` section of lockfiles generated by 1.10+ will be preserved (@segiddins)

## 1.9.9 (2015-05-16)

Bugfixes:

  - read mirror and credential settings from older versions (#3557, @Strech)

## 1.9.8 (2015-05-12)

Bugfixes:

  - fix regression in sudo mode introduced by 1.9.7 (#3642, @segiddins)

## 1.9.7 (2015-05-11)

Bugfixes:

  - always clean up tmp dirs (#3277, @hone, @indirect, @segiddins)

## 1.9.6 (2015-05-02)

Bugfixes:

  - use RubyGems spec stubs if available (@segiddins)
  - allow creating gems with names containing two dashes (#3483, @janlelis)
  - allow creating gems with names extending constants (#3603, @amatsuda)

## 1.9.5 (2015-04-29)

Bugfixes:

  - respect Gemfile sources when installing a gem present in two sources (#3585, @tmoore)

## 1.9.4 (2015-04-13)

Bugfixes:

  - fix regression in installing x86 and universal gems (#3565, @jdmundrawala)
  - improve error when gems are missing (#3564, @sealocal)

## 1.9.3 (2015-04-12)

Bugfixes:

  - handle removal of `specs` from rubygems/rubygems@620910 (#3558, @indirect)
  - install 'universal' gems on Windows (#3066, @jdmundrawala)
  - stop passing --local during `rake install` task (#3236, @indirect)
  - guard against all possible accidental public gem pushes (#3533, @indirect)

## 1.9.2 (2015-03-30)

Bugfixes:

  - ensure gem executables are executable (#3517, #3511, @indirect)
  - fix warnings in Molinillo (#3516, @segiddins)
  - ensure duplicate dependencies do not propagate (#3522, @segiddins)
  - keep gems locked when updating another gem from the same source (#3520, @indirect)
  - resolve race that could build gems without saved arguments (#3404, @indirect)

## 1.9.1 (2015-03-21)

Bugfixes:

  - avoid exception in 'bundler/gem_tasks' (#3492, @segiddins)

## 1.9.0 (2015-03-20)

## 1.9.0.rc (2015-03-13)

Bugfixes:

  - make Bundler.which stop finding directories (@nohoho)
  - handle Bundler prereleases correctly (#3470, @segiddins)
  - add before_install to .travis.yml template for new gems (@kodnin)

## 1.9.0.pre.1 (2015-03-11)

Bugfixes:

  - make `gem` command work again (@arthurnn)

## 1.9.0.pre (2015-03-11)

Features:

  - prefer gemspecs closest to the directory root (#3428, @segiddins)
  - debug log for API request limits (#3452, @neerfri)

"Features":

  - Molinillo resolver, shared with CocoaPods (@segiddins)
  - updated Thor to v0.19.1 (@segiddins)

## 1.8.9 (2015-05-02)

Bugfixes:

  - Use RubyGems spec stubs if available (@segiddins)

## 1.8.8 (2015-04-29)

Bugfixes:

  - Respect Gemfile sources when installing a gem present in two sources (#3585, @tmoore)

## 1.8.7 (2015-04-07)

Bugfixes:

  - stop suppressing errors inside gems that get required (#3549, @indirect)

## 1.8.6 (2015-03-30)

Bugfixes:

  - keep gems locked when updating another gem from the same source (#3250, @indirect)
  - resolve race that could build gems without saved arguments (#3404, @indirect)

## 1.8.5 (2015-03-11)

Bugfixes:

  - remove MIT license from gemspec when removing license file (@indirect)
  - respect 'no' immediately as well as saving it in `gem` config (@kirs)

## 1.8.4 (2015-03-05)

Bugfixes:

  - document --all-platforms option (#3449, @moeffju)
  - find gems from all sources on exec after install (#3450, @TimMoore)

## 1.8.3 (2015-02-24)

Bugfixes:

  - handle boolean values for gem settings (@EduardoBautista)
  - stop always looking for updated `path` gems (#3414, #3417, #3429, @TimMoore)

## 1.8.2 (2015-02-14)

Bugfixes:

  - allow config settings for gems with 'http' in the name again (#3398, @TimMoore)

## 1.8.1 (2015-02-13)

Bugfixes:

  - synchronize building git gem native extensions (#3385, @antifuchs & @indirect)
  - set gemspec bindir correctly (#3392, @TimMoore)
  - request lockfile deletion when it is malformed (#3396, @indirect)
  - explain problem when mirror config is missing (#3386, @indirect)
  - explain problem when caching causes permission error (#3390, @indirect)
  - normalize URLs in config keys (#3391, @indirect)

## 1.8.0 (2015-02-10)

Bugfixes:

  - gemfile `github` blocks now work (#3379, @indirect)

Bugfixes from v1.7.13:

  - look up installed gems in remote sources (#3300, #3368, #3377, #3380, #3381, @indirect)
  - look up gems across all sources to satisfy dependencies (#3365, @keiths-osc)
  - request dependencies for no more than 100 gems at a time (#3367, @segiddins)

## 1.8.0.rc (2015-01-26)

Features:

  - add `config disable_multisource` option to ensure sources can't compete (@indirect)

Bugfixes:

  - don't add extra quotes around long, quoted config values (@aroben, #3338)

Security:

  - warn when more than one top-level source is present (@indirect)

## 1.8.0.pre (2015-01-26)

Features:

  - add metadata allowed_push_host to new gem template (#3002, @juanitofatas)
  - adds a `--no-install` flag to `bundle package` (@d-reinhold)
  - add `bundle config auto_install true` to install automatically (@smashwilson)
  - add `bundle viz --without` to exclude gem groups from resulting graph (@fnichol)
  - prevent whitespace in gem declarations with clear messaging (@benlakey)
  - tries to find a `bundler-<command>` executable on your path for non-bundler commands (@andremedeiros)
  - tries to find `gems.rb` and it's new counterpart, `gems.locked` (@andremedeiros)
  - change the initial version of new gems from `0.0.1` to `0.1.0` (@petedmarsh)
  - add `package --all-platforms` to cache gems for each known platform (@ccutrer)
  - speed up `exec` when running commands on the $PATH (@kirs)
  - add gem code of conduct file and option (@kirs)
  - add config settings for gem license and tests (@kirs)
  - add `bin/setup` and `bin/console` to new gems (@indirect)
  - include configured user-agent in network requests (@indirect)
  - support `github`, `gist`, and `bitbucket` options on git gems (@indirect)
  - add `package --cache-path` and `config cache_path` for cache location (@jnraine)
  - allow `config` to work even when a Gemfile is not present (@dholdren)
  - add `config gemfile /path` for other Gemfile locations (@dholdren)
  - add `github` method alonside the `git` method (@BenMorganIO)

Bugfixes:

  - reduce memory usage with threaded parallel workers (@Who828)
  - support read-only git gems (@pmahoney)
  - various resolver performance improvements (@dubek)
  - untaint git gem paths for Rubygems compatibility (@tdtds)

Documentation:

  - add missing Gemfile global `path` explanation (@agenteo)

## 1.7.15 (2015-04-29)

Bugfixes:

  - Respect Gemfile sources when installing a gem present in two sources (#3585, @tmoore)

## 1.7.14 (2015-03-30)

Bugfixes:

  - Keep gems locked when updating another gem from the same source (#3250, @indirect)
  - Don't add extra quotes around long, quoted config values (@aroben, #3338)

## 1.7.13 (2015-02-07)

Bugfixes:

  - Look up installed gems in remote sources (#3300, #3368, #3377, #3380, #3381, @indirect)
  - Look up gems across all sources to satisfy dependencies (#3365, @keiths-osc)
  - Request dependencies for no more than 100 gems at a time (#3367, @segiddins)

## 1.7.12 (2015-01-08)

Bugfixes:

  - Always send credentials for sources, fixing private Gemfury gems (#3342, @TimMoore)

## 1.7.11 (2015-01-04)

Bugfixes:

  - Recognize `:mri_22` and `:mingw_22`, rather than just `:ruby_22` (#3328, @myabc)

## 1.7.10 (2014-12-29)

Bugfixes:

  - Fix source blocks sometimes causing deployment mode to fail wrongly (#3298, @TimMoore)

Features(?):

  - Support `platform :mri_22` and related version bits (#3309, @thomasfedb)

## 1.7.9 (2014-12-09)

Bugfixes:

  - Fix an issue where bundler sometime spams one gem in Gemfile.lock (#3216, @Who828)
  - Ensure bundle update installs the newer version of the gem (#3089, @Who828)
  - Fix an regression which stopped Bundler from resolving some Gemfiles (#3059, #3248, @Who828)

## 1.7.8 (2014-12-06)

Bugfixes:

  - Hide credentials while warning about gems with ambiguous sources (#3256, @TimMoore)

## 1.7.7 (2014-11-19)

Bugfixes:

  - Ensure server credentials stored in config or ENV will be used (#3180, @arronmabrey)
  - Fix race condition causing errors while installing git-based gems (#3174, @Who828)
  - Use single quotes in config so YAML won't add more quotes (#3261, @indirect)

## 1.7.6 (2014-11-11)

Bugfixes:

  - CA certificates that work with all OpenSSLs (@luislavena, @indirect)

## 1.7.5 (2014-11-10)

Bugfixes:

  - Fix --deployment with source blocks and non-alphabetical gems (#3224, @TimMoore)
  - Vendor CA chain to validate new rubygems.org HTTPS certificate (@indirect)

## 1.7.4 (2014-10-19)

Bugfixes:

  - Allow --deployment after `pack` while using source blocks (#3167, @TimMoore)
  - Use dependency API even when HTTP credentials are in ENV (#3191, @fvaleur)
  - Silence warnings (including root warning) in --quiet mode (#3186, @indirect)
  - Stop asking gem servers for gems already found locally (#2909, @dubek)

## 1.7.3 (2014-09-14)

Bugfixes:

  - `extconf.rb` is now generated with the right path for `create_makefile` (@andremedeiros)
  - Fix various Ruby warnings (@piotrsanarki, @indirect)

## 1.7.2 (2014-08-23)

Bugfixes:

  - Revert gem source sorting in lock files (@indirect)

## 1.7.1 (2014-08-20)

Bugfixes:

  - Install gems from one source needed by gems in another source (@indirect)
  - Install the same gem versions even after some are installed (@TimMoore)
  - Download specs only when installing from servers (@indirect)

## 1.7.0 (2014-08-13)

Security:

  - Fix for CVE-2013-0334, installing gems from an unexpected source (@TimMoore)

Features:

  - Gemfile `source` calls now take a block containing gems from that source (@TimMoore)
  - Added the `:source` option to `gem` to specify a source (@TimMoore)

Bugfixes:

  - Warn on ambiguous gems available from more than one source (@TimMoore)

## 1.6.7 (2014-10-19)

Features:

  - warn to upgrade when using useless source blocks (@danfinnie)

Documentation:

  - explain how to use gem server credentials via ENV (@hwartig)

## 1.6.6 (2014-08-23)

Bugfixes:

  - restore Gemfile credentials to Gemfile.lock (@indirect)

## 1.6.5 (2014-07-23)

Bugfixes:

  - require openssl explicitly to fix rare HTTPS request failures (@indirect, #3107)

## 1.6.4 (2014-07-17)

Bugfixes:

  - fix undefined constant error when can't find gem during binstubs (#3095, @jetaggart)
  - work when installed git gems are not writable (#3092, @pmahoney)
  - don't store configured source credentials in Gemfile.lock (#3045, @lhz)
  - don't include config source credentials in the lockfile (Lars Haugseth)
  - use threads for jobs on Rubinius (@YorickPeterse)
  - skip dependencies from other platforms (@mvz)
  - work when Rubygems was built without SSL (@andremedeiros)

## 1.6.3 (2014-06-16)

Bugfixes:

  - fix regression when resolving many conflicts (#2994, @Who828)
  - use local gemspec for builtin gems during install --local (#3041, @Who828)
  - don't warn about sudo when installing on Windows (#2984, @indirect)
  - shell escape `bundle open` arguments (@indirect)

## 1.6.2 (2014-04-13)

Bugfixes:

  - fix an exception when using builtin gems (#2915, #2963, @gnufied)
  - cache gems that are built in to the running ruby (#2975, @indirect)
  - re-allow deploying cached git gems without git installed (#2968, @aughr)
  - keep standalone working even with builtin gems (@indirect)
  - don't update vendor/cache in deployment mode (#2921, @indirect)

Features:

  - warn informatively when `bundle install` is run as root (#2936, @1337807)

## 1.6.1 (2014-04-02)

Bugfixes:

  - update C extensions when git gem versions change (#2948, @dylanahsmith)

Features:

  - add support for C extensions in sudo mode on Rubygems 2.2

## 1.6.0 (2014-03-28)

Bugfixes:

  - many Gemfiles that caused incorrect errors now resolve correctly (@Who828)
  - redirects across hosts now work on rubies without OpenSSL (#2686, @grddev)
  - gemspecs now handle filenames with newlines (#2634, @jasonmp85)
  - support escaped characters in usernames and passwords (@punkie)
  - no more exception on `update GEM` without lock file (@simi)
  - allow long config values (#2823, @kgrz)
  - cache successfully even locked to gems shipped with Ruby (#2869, @aughr)
  - respect NO_PROXY even if a proxy is configured (#2878, @stlay)
  - only retry git commands that hit the network (#2899, @timmoore)
  - fix NameError regression when OpenSSL is not available (#2898, @timmoore)
  - handle exception installing when build_info owned by root (@Who828)
  - skip HTTP redirects from rubygems.org, huge speed boost (@Who828)

Features:

  - resolver rewritten to avoid recursion (@Who828)
  - add `git_source` for custom options like :github and :gist (@strzalek)
  - HTTP auth may now be stored in `bundle config` (@smashwilson)
  - some complex Gemfiles are resolved up to 10x faster (@Who828)
  - add support for IRB alternatives such as Pry and Ripl (@joallard, @postmodern)
  - highlight installed or updated gems (#2722, #2741, @yaotti, @simi)
  - display the `post_install_message` for gems installed via :git (@phallstrom)
  - `bundle outdated --strict` now only reports allowed updates (@davidblondeau)
  - `bundle show --verbose` Add gem summary to the output (@lardcanoe)
  - `bundle gem GEM --ext` now generates a skeleton for a C extension (@superdealloc)
  - Avoid using threequals operator where possible (@as-cii)
  - Add `bundle update --group` to update specific group (#2731 @banyan)

Documentation:

  - Add missing switches for bundle-install(1) and bundle-update(1) (@as-cii)

## 1.5.3 (2014-02-06)

Bugfixes:

  - find "missing" gems that are actually present (#2780, #2818, #2854)
  - use n-1 cores when given n jobs for parallel install (@jdickey)

## 1.5.2 (2014-01-10)

Bugfixes:

  - fix integration with Rubygems 1.8.0-1.8.19
  - handle ENETDOWN exception during network requests
  - gracefully shut down after interrupt during parallel install (@Who828)
  - allow Rails to run Thor without debug mode (@rafaelfranca)
  - set git binstub permissions by umask (@v-yarotsky)
  - remove parallel install debug log

## 1.5.1 (2013-12-28)

Bugfixes:

  - correctly find gems installed with Ruby by default

## 1.5.0 (2013-12-26)

Features:

  - install missing gems if their specs are present (@hone)

Bugfixes:

  - use print for "Installing…" so messages are thread-safe (@TimMoore)

## 1.5.0.rc.2 (2013-12-18)

"Features":

  - Support threaded installation on Rubygems 2.0.7+
  - Debug installation logs in .bundle/install.log

"Bugfixes":

  - Try to catch gem installation race conditions

## 1.5.0.rc.1 (2013-11-09)

Features:

  - bundle update also accepts --jobs (#2692, @mrkn)
  - add fork URL to README for new `bundle gem` (#2665, @zzak)
  - add `bundle outdated --strict` (#2685, @davidblondeau)
  - warn if same gem/version is added twice (#2679, @jendiamond)
  - don't redownload installed specs for `bundle install` (#2680, @cainlevy)
  - override gem sources with mirrors (#2650, @danielsdeleo, @mkristian)

Bugfixes:

  - fix sharing same SSL socket when forking workers for parallel install (#2632)
  - fix msg typo in GitNotAllowedError (#2654, @joyicecloud)
  - fix Bundler.which for directories (#2697, @rhysd)
  - properly require `Capistrano::Version` (#2690, @steveklabnik)
  - search for git.exe and git
  - fix the bug that downloads every spec when API fetcher encouters an error
  - only retry network requests

## 1.4.0.rc.1 (2013-09-29)

Features:

  - add support for the x64-mingw32 platform (#2356, #2590, @larskanis)
  - add :patchlevel option to ruby DSL
  - add `bundler` bin (#2598, @kirs)
  - friendly ambiguous error messages (#2581, #2550, @jlsuttles, @jendiamond, @joyicecloud)
  - add `:jruby_18` and `:jruby_19` platform options (@mcfiredrill)
  - add X.509 client certificates for auth without passwords (@snackbandit)
  - add `exec --keep-file-descriptors` for Ruby 1.9-like behavior on 2.0 (@steved555)
  - print a better error when git is not installed (@joyicecloud)
  - exit non-zero when `outdated` is run with an unknown gem (@joyicecloud)
  - add `:ruby_21` platform option (@brandonblack)
  - add `--retry` to retry failed network and git commands (@schneems)
  - include command and versions in User-Agent (@indirect, @joyicecloud)

Bugfixes:

  - allow passwordless Basic Auth (#2606, @rykov)
  - don't suggest `gem install foo` when `foo` is a git gem that fails (@kirs)
  - revert #2569, staying compatible with git: instead of https: for :github gems
  - handle exceptions while installing gems in parallel (@gnufied)

## 1.4.0.pre.1 (2013-08-04)

Features:

  - retry network requests while installing gems (#2561, @ascherger)
  - faster installs using gemspecs from the local system cache (#2497, @mipearson)
  - add `bundle install -jN` for N parallel gem installations (#2481, @eagletmt)
  - add `ENV['DEBUG_RESOLVER_TREE']` outputs resolver tree (@dblock)
  - set $MANPATH so `bundle exec man name` works (#1624, @sunaku)
  - use `man` instead of `groff` (#2579, @ixti, @simi)
  - add Gemfile dependency info to bundle outdated output (#2487, @rahearn)
  - allow `require: true` as an alias for `require: <name>` (#2538, @ndbroadbent)
  - rescue and report Thor errors (#2478, @pjvds)
  - detect cyclic dependencies (#2564, @gnufied)
  - support multiple gems in `binstubs` (#2576, @lucasmazza)
  - use https instead of git for :github gems (#2569, @fuadsaud)
  - add quiet option to `bundle package` (#2573, @shtirlic)
  - use RUBYLIB instead of RUBYOPT for better Windows support (#2536, @equinux)

Bugfixes:

  - reduce stack size while resolving to fix JRuby overflow (#2510, @headius)
  - display GitErrors while loading specs in --verbose mode (#2461)
  - allow the same options hash to be passed to multiple gems (#2447)
  - handle missing binaries without an exception (#2019, @luismreis)

## 1.3.6 (8 January 2014)

Bugfixes:

  - make gemspec path option preserve relative paths in lock file (@bwillis)
  - use umask when creating binstubs (#1618, @v-yarotsky)
  - warn if graphviz is not installed (#2435, @Agis-)
  - show git errors while loading gemspecs
  - don't mutate gem method options hash (#2447)
  - print Thor errors (#2478, @pjvds)
  - print Rubygems system exit errors (James Cook)
  - more Pathnames into Strings for MacRuby (@kml)
  - preserve original gemspec path (@bwillis)
  - remove warning about deps with :git (#1651, @ixti)
  - split git files on null (#2634, @jasonmp85)
  - handle cross-host redirects without SSL (#2686, @grddev)
  - handle Rubygems 2 security exception (@zzak)
  - reinstall gems if they are missing with spec present
  - set binstub permissions using umask (#1618, @v-yarotsky)

## 1.3.5 (3 April 2013)

Features:

  - progress indicator while resolver is running (@chief)

Bugfixes:

  - update local overrides with orphaned revisions (@jamesferguson)
  - revert to working quoting of RUBYOPT on Windows (@ogra)
  - use basic auth even when SSL is not available (@jayniz)
  - installing git gems without dependencies in deployment now works

## 1.3.4 (15 March 2013)

Bugfixes:

  - load YAML on Rubygems versions that define module YAML
  - fix regression that broke --without on ruby 1.8.7

## 1.3.3 (13 March 2013)

Features:

  - compatible with Rubygems 2.0.2 (higher and lower already work)
  - mention skipped groups in bundle install and bundle update output (@simi)
  - `gem` creates rake tasks for minitest (@coop) and rspec

Bugfixes:

  - require rbconfig for standalone mode

## 1.3.2 (7 March 2013)

Features:

  - include rubygems.org CA chain

Bugfixes:

  - don't store --dry-run as a Bundler setting

## 1.3.1 (3 March 2013)

Bugfixes:

  - include manpages in gem, restoring many help pages
  - handle more SSL certificate verification failures
  - check for the full version of SSL, which we need (@alup)
  - gem rake task 'install' now depends on task 'build' (@sunaku)

## 1.3.0 (24 February 2013)

Features:

  - raise a useful error when the lockfile contains a merge conflict (@zofrex)
  - ensure `rake release` checks for uncommitted as well as unstaged (@benmoss)
  - allow environment variables to be negated with 'false' and '0' (@brettporter)
  - set $MANPATH inside `exec` for gems with man pages (@sunaku)
  - partial gem names for `open` and `update` now return a list (@takkanm)

Bugfixes:

  - `update` now (again) finds gems that aren't listed in the Gemfile
  - `install` now (again) updates cached gems that aren't in the Gemfile
  - install Gemfiles with HTTP sources even without OpenSSL present
  - display CerficateFailureError message in full

## 1.3.0.pre.8 (12 February 2013)

Security:

  - validate SSL certificate chain during HTTPS network requests
  - don't send HTTP Basic Auth creds when redirected to other hosts (@perplexes)
  - add `--trust-policy` to `install`, like `gem install -P` (@CosmicCat, #2293)

Features:

  - optimize resolver when too new of a gem is already activated (@rykov, #2248)
  - update Net::HTTP::Persistent for SSL cert validation and no_proxy ENV
  - explain SSL cert validation failures
  - generate gemspecs when installing git repos, removing shellouts
  - add pager selection (@csgui)
  - add `licenses` command (@bryanwoods, #1898)
  - sort output from `outdated` (@richardkmichael, #1896)
  - add a .travis.yml to `gem -t` (@ndbroadbent, #2143)
  - inform users when the resolver starts
  - disable reverse DNS to speed up API requests (@raggi)

Bugfixes:

  - raise errors while requiring dashed gems (#1807)
  - quote the Bundler path on Windows (@jgeiger, #1862, #1856)
  - load gemspecs containing unicode (@gaffneyc, #2301)
  - support any ruby version in --standalone
  - resolve some ruby -w warnings (@chastell, #2193)
  - don't scare users with an error message during API fallback
  - `install --binstubs` is back to overwriting. thanks, SemVer.

## 1.3.0.pre.7 (22 January 2013)

Bugfixes:

  - stubs for gems with dev deps no longer cause exceptions (#2272)
  - don't suggest binstubs to --binstubs users

## 1.3.0.pre.6 (22 January 2013)

Features:

  - `binstubs` lists child gem bins if a gem has no binstubs
  - `bundle gem --edit` will open the new gemspec (@ndbroadbent)
  - `bundle gem --test rspec` now makes working tests (@tricknotes)
  - `bundle env` prints info about bundler's environment (@peeja)
  - add `BUNDLE_IGNORE_CONFIG` environment variable support (@richo)

Bugfixes:

  - don't overwrite custom binstubs during `install --binstubs`
  - don't throw an exception if `binstubs` gem doesn't exist
  - `bundle config` now works in directories without a Gemfile

## 1.3.0.pre.5 (Jan 9, 2013)

Features:

  - make `--standalone` require lines ruby engine/version agnostic
  - add `--dry-run` to `bundle clean` (@wfarr, #2237)

Bugfixes:

  - don't skip writing binstubs when doing `bundle install`
  - distinguish between ruby 1.9/2.0 when using :platforms (@spastorino)

## 1.3.0.pre.4 (Jan 3, 2013)

Features:

  - `bundle binstubs <gem>` to setup individual binstubs
  - `bundle install --binstubs ""` will remove binstubs option
  - `bundle clean --dry-run` will print out gems instead of removing them

Bugfixes:

  - Avoid stack traces when Ctrl+C during bundle command (@mitchellh)
  - fix YAML parsing in in ruby-preview2

## 1.3.0.pre.3 (Dec 21, 2012)

Features:

  - pushing gems during `rake release` can be disabled (@trans)
  - installing gems with `rake install` is much faster (@utkarshkukreti)
  - added platforms :ruby_20 and :mri_20, since the ABI has changed
  - added '--edit' option to open generated gemspec in editor

Bugfixes:

  - :git gems with extensions now work with Rubygems >= 2.0 (@jeremy)
  - revert SemVer breaking change to :github
  - `outdated` exits non-zero if outdated gems found (@rohit, #2021)
  - https Gist URLs for compatibility with Gist 2.0 (@NARKOZ)
  - namespaced gems no longer generate a superfluous directory (@banyan)

## 1.3.0.pre.2 (Dec 9, 2012)

Features:

  - `config` expands local overrides like `local.rack .` (@gkop, #2205)
  - `gem` generates files correctly for names like `jquery-rails` (@banyan, #2201)
  - use gems from gists with the :gist option in the Gemfile (@jgaskins)

Bugfixes:

  - Gemfile sources other than rubygems.org work even when .gemrc contains sources
  - caching git gems now caches specs, fixing e.g. git ls-files (@bison, #2039)
  - `show GEM` now warns if the directory has been deleted (@rohit, #2070)
  - git output hidden when running in --quiet mode (@rohit)

## 1.3.0.pre (Nov 29, 2012)

Features:

  - compatible with Ruby 2.0.0-preview2
  - compatible with Rubygems 2.0.0.preview2 (@drbrain, @evanphx)
  - ruby 2.0 added to the `:ruby19` ABI-compatible platform
  - lazy load YAML, allowing Psych to be specified in the Gemfile
  - significant performance improvements (@cheald, #2181)
  - `inject` command for scripted Gemfile additions (Engine Yard)
  - :github option uses slashless arguments as repo owner (@rking)
  - `open` suggests gem names for typos (@jdelStrother)
  - `update` reports non-existent gems (@jdelStrother)
  - `gem` option --test can generate rspec stubs (@MafcoCinco)
  - `gem` option --test can generate minitest stubs (@kcurtin)
  - `gem` command generates MIT license (@BrentWheeldon)
  - gem rake task 'release' resuses existing tags (@shtirlic)

Bugfixes:

  - JRuby new works with HTTPS gem sources (@davidcelis)
  - `install` installs both rake rake-built gems at once (@crowbot, #2107)
  - handle Errno::ETIMEDOUT errors (@jmoses)
  - handle Errno::EAGAIN errors on JRuby
  - disable ANSI coloring when output is redirected (@tomykaira)
  - raise LoadErrors correctly during Bundler.require (@Empact)
  - do not swallow --verbose on `bundle exec` (@sol, #2102)
  - `gem` generates gemspecs that block double-requires
  - `gem` generates gemspecs that admit they depend on rake

## 1.2.5 (Feb 24, 2013)

Bugfixes:

  - install Gemfiles with HTTP sources even without OpenSSL present
  - display CerficateFailureError message in full

## 1.2.4 (Feb 12, 2013)

Features:

  - warn about Ruby 2.0 and Rubygems 2.0
  - inform users when the resolver starts
  - disable reverse DNS to speed up API requests (@raggi)

Bugfixes:

  - don't send user/pass when redirected to another host (@perplexes)
  - load gemspecs containing unicode (@gaffneyc, #2301)
  - support any ruby version in --standalone
  - resolve some ruby -w warnings (@chastell, #2193)
  - don't scare users with an error message during API fallback

## 1.2.3 (Nov 29, 2012)

Bugfixes:

  - fix exceptions while loading some gemspecs

## 1.2.2 (Nov 14, 2012)

Bugfixes:

  - support new Psych::SyntaxError for Ruby 2.0.0 (@tenderlove, @sol)
  - `bundle viz` works with git gems again (@hirochachacha)
  - recognize more cases when OpenSSL is not present

## 1.2.1 (Sep 19, 2012)

Bugfixes:

  - `bundle clean` now works with BUNDLE_WITHOUT groups again
  - have a net/http read timeout around the Gemcutter API Endpoint

## 1.2.0 (Aug 30, 2012)

Bugfixes:

  - raise original error message from LoadError's

Documentation:

  - `platform` man pages

## 1.2.0.rc.2 (Aug 8, 2012)

Bugfixes:

  - `clean` doesn't remove gems that are included in the lockfile

## 1.2.0.rc (Jul 17, 2012)

Features:

  - `check` now has a `--dry-run` option (@svenfuchs, #1811)
  - loosen ruby directive for engines
  - prune git/path directories inside vendor/cache (@josevalim, #1988)
  - update vendored thor to 0.15.2 (@sferik)
  - add .txt to LICENSE (@postmodern, #2001)
  - add `config disable_local_branch_check` (@josevalim, #1985)
  - fall back on the full index when experiencing syck errors (#1419)
  - handle syntax errors in Ruby gemspecs (#1974)

Bugfixes:

  - fix `pack`/`cache` with `--all` (@josevalim, #1989)
  - don't display warning message when `cache_all` is set
  - check for `nil` PATH (#2006)
  - Always try to keep original GEM_PATH (@drogus, #1920)

## 1.2.0.pre.1 (May 27, 2012)

Features:

  - Git gems import submodules of submodules recursively (@nwwatson, #1935)

Bugfixes:

  - Exit from `check` with a non-zero status when frozen with no lock
  - Use `latest_release` in Capistrano and Vlad integration (#1264)
  - Work around a Ruby 1.9.3p194 bug in Psych when config files are empty

Documentation:

  - Add instructions for local git repos to the `config` manpage
  - Update the `Gemfile` manpage to include ruby versions (@stevenh512)
  - When OpenSSL is missing, provide instructions for fixing (#1776 etc.)
  - Unknown exceptions now link to ISSUES for help instead of a new ticket
  - Correct inline help for `clean --force` (@dougbarth, #1911)

## 1.2.0.pre (May 4, 2012)

Features:

  - bundle package now accepts --all to package git and path dependencies
  - bundle config now accepts --local, --global and --delete options
  - It is possible to override a git repository via configuration.
    For instance, if you have a git dependency on rack, you can force
    it to use a local repo with `bundle config local.rack ~/path/to/rack`
  - Cache gemspec loads for performance (@dekellum, #1635)
  - add --full-index flag to `bundle update` (@fluxx, #1829)
  - add --quiet flag to `bundle update` (@nashby, #1654)
  - Add Bundler::GemHelper.gemspec (@knu, #1637)
  - Graceful handling of Gemfile syntax errors (@koraktor, #1661)
  - `bundle platform` command
  - add ruby to DSL, to specify version of ruby
  - error out if the ruby version doesn't match

Performance:

  - bundle exec shouldn't run Bundler.setup just setting the right rubyopts options is enough (@spastorino, #1598)

Bugfixes:

  - Avoid passing RUBYOPT changes in with_clean_env block (@eric1234, #1604)
  - Use the same ruby to run subprocesses as is running rake (@brixen)

Documentation:

  - Add :github documentation in DSL (@zofrex, #1848, #1851, #1852)
  - Add docs for the --no-cache option (@fluxx, #1796)
  - Add basic documentation for bin_path and bundle_path (@radar)
  - Add documentation for the run method in Bundler::Installer

## 1.1.5 (Jul 17, 2012)

Features:

  - Special case `ruby` directive from 1.2.0, so you can install Gemfiles that use it

## 1.1.4 (May 27, 2012)

Bugfixes:

  - Use `latest_release` in Capistrano and Vlad integration (#1264)
  - Unknown exceptions now link to ISSUES for help instead of a new ticket
  - When OpenSSL is missing, provide instructions for fixing (#1776 etc.)
  - Correct inline help for `clean --force` (@dougbarth, #1911)
  - Work around a Ruby 1.9.3p194 bug in Psych when config files are empty

## 1.1.3 (March 23, 2012)

Bugfixes:

  - escape the bundler root path (@tenderlove, #1789)

## 1.1.2 (March 20, 2012)

Bugfixes:

  - Fix --deployment for multiple PATH sections of the same source (#1782)

## 1.1.1 (March 14, 2012)

Bugfixes:

  - Rescue EAGAIN so the fetcher works on JRuby on Windows
  - Stop asking users to report gem installation errors
  - Clarify "no sources" message
  - Use $\ so `bundle gem` gemspecs work on Windows (@postmodern)
  - URI-encode gem names for dependency API (@rohit, #1672)
  - Fix `cache` edge case in rubygems 1.3.7 (#1202)

Performance:

  - Reduce invocation of git ls-files in `bundle gem` gemspecs (@knu)

## 1.1.0 (Mar 7, 2012)

Bugfixes:

  - Clean up corrupted lockfiles on bundle installs
  - Prevent duplicate GIT sources
  - Fix post_install_message when uing the endpoint API

## 1.1.rc.8 (Mar 3, 2012)

Performance:

  - don't resolve if the Gemfile.lock and Gemfile haven't changed

Bugfixes:

  - Load gemspecs from git even when a released gem has the same version (#1609)
  - Declare an accurate Ruby version requirement of 1.8.7 or newer (#1619)
  - handle gemspec development dependencies correctly (@raggi, #1639)
  - Avoid passing RUBYOPT changes in with_clean_env block. (eric1234, #1604)

## 1.1.rc.7 (Dec 29, 2011)

Bugfixes:

  - Fix bug where `clean` would break when using :path with no gemspec

## 1.1.rc.6 (Dec 22, 2011)

Bugfixes:

  - Fix performance regression from 1.0 (@spastorino, #1511, #1591, #1592)
  - Load gems correctly when GEM_HOME is blank
  - Refresh gems so Bundler works from inside a bundle
  - Handle empty .bundle/config files without an error

## 1.1.rc.5 (Dec 14, 2011)

Bugfixes:

  - Fix ASCII encoding errors with gem (rerelease with ruby 1.8)

## 1.1.rc.4 (Dec 14, 2011)

Features:

  - `bundle viz` has the option to output a DOT file instead of a PNG (@hirochachacha, #683)

Bugfixes:

  - Ensure binstubs generated when using --standalone point to the standalonde bundle (@cowboyd, #1588)
  - fix `bundle viz` (@hirochachacha, #1586)

## 1.1.rc.3 (Dec 8, 2011)

Bugfixes:

  - fix relative_path so it checks Bundler.root is actually in the beginning of the path (#1582)
  - fix bundle outdated doesn't list all gems (@joelmoss, #1521)

## 1.1.rc.2 (Dec 6, 2011)

Features:

  - Added README.md to `newgem` (@ognevsky, #1574)
  - Added LICENSE (MIT) to newgem (@ognevsky, #1571)

Bugfixes:

  - only auto-namespace requires for implied requires (#1531)
  - fix bundle clean output for git repos (#1473)
  - use Gem.bindir for bundle clean (#1544, #1532)
  - use `Gem.load_env_plugins` instead of `Gem.load_env_plugins` (#1500, #1543)
  - differentiate Ruby 2.0 (trunk) from Ruby 1.9 (@tenderlove, #1539)
  - `bundle clean` handles 7 length git hash for bundle clean (#1490, #1491)
  - fix Psych loading issues
  - Search $PATH for a binary rather than shelling out to `which` (@tenderlove, #1573)
  - do not clear RG cache unless we actually modify GEM_PATH and GEM_HOME- use `Gem.load_env_plugins` instead of `Gem.load_env_plugins` (#1500, #1543)
  - `newgem` now uses https://rubygems.org (#1562)
  - `bundle init` now uses https://rubygems.org (@jjb, #1522)
  - `bundle install/update` does not autoclean when using --path for semver

Documentation:

  - added documentation for --shebang option for `bundle install` (@lunks, #1475, #1558)

## 1.1.rc (Oct 3, 2011)

Features:

  - add `--shebang` option to bundle install (@bensie, #1467)
  - build passes on ruby 1.9.3rc1 (#1458, #1469)
  - hide basic auth credentials for custom sources (#1440, #1463)

Bugfixes:

  - fix index search result caching (#1446, #1466)
  - fix fetcher prints multiple times during install (#1445, #1462)
  - don't mention API errors from non-rubygems.org sources
  - fix autoclean so it doesn't remove bins that are used (#1459, #1460)

Documentation:

  - add :require => [...] to the gemfile(5) manpage (@nono, #1468)

## 1.1.pre.10 (Sep 27, 2011)

Features:

  - `config system_bindir foo` added, works like "-n foo" in your .gemrc file

## 1.1.pre.9 (Sep 18, 2011)

Features:

  - `clean` will now clean up all old .gem and .gemspec files, cleaning up older pres
  - `clean` will be automatically run after bundle install and update when using `--path` (#1420, #1425)
  - `clean` now takes a `--force` option (#1247, #1426)
  - `clean` will clean up cached git dirs in bundle clean (#1390)
  - remove deprecations from DSL (#1119)
  - autorequire tries directories for gems with dashed names (#1205)
  - adds a `--paths` flag to `bundle show` to list all the paths of bundled gems (@tiegz, #1360)
  - load rubygems plugins in the bundle binary (@tpope, #1364)
  - make `--standalone` respect `--path` (@cowboyd, #1361)

Bugfixes:

  - Fix `clean` to handle nested gems in a git repo (#1329)
  - Fix conflict from revert of benchmark tool (@boffbowsh, #1355)
  - Fix fatal error when unable to connect to gem source (#1269)
  - Fix `outdated` to find pre-release gems that are installed. (#1359)
  - Fix color for ui. (#1374)
  - Fix installing to user-owned system gems on OS X
  - Fix caching issue in the resolver (#1353, #1421)
  - Fix :github DSL option

## 1.1.pre.8 (Aug 13, 2011)

Bugfixes:

  - Fix `bundle check` to not print fatal error message (@cldwalker, #1347)
  - Fix require_sudo when Gem.bindir isn't writeable (#1352)
  - Fix not asking Gemcutter API for dependency chain of git gems in --deployment (#1254)
  - Fix `install --binstubs` when using --path (#1332)

## 1.1.pre.7 (Aug 8, 2011)

Bugfixes:

  - Fixed invalid byte sequence error while installing gem on Ruby 1.9 (#1341)
  - Fixed exception when sudo was needed to install gems (@spastorino)

## 1.1.pre.6 (Aug 8, 2011)

Bugfixes:

  - Fix cross repository dependencies (#1138)
  - Fix git dependency fetching from API endpoint (#1254)
  - Fixes for bundle outdated (@joelmoss, #1238)
  - Fix bundle standalone when using the endpoint (#1240)

Features:

  - Implement `to_ary` to avoid calls to method_missing (@tenderlove, #1274)
  - bundle clean removes old .gem files (@cldwalker, #1293)
  - Correcly identify missing child dependency in error message
  - Run pre-install, post-build, and post-install gem hooks for git gems (@warhammerkid, #1120)
  - create Gemfile.lock for empty Gemfile (#1218)

## 1.1.pre.5 (June 11, 2011)

Bugfixes:

  - Fix LazySpecification on Ruby 1.9 (@dpiddy, #1232)
  - Fix HTTP proxy support (@leobessa, #878)

Features:

  - Speed up `install --deployment` by using the API endpoint
  - Support Basic HTTP Auth for the API endpoint (@dpiddy, #1229)
  - Add `install --full-index` to disable the API endpoint, just in case
  - Significantly speed up install by removing unneeded gemspec fetches
  - `outdated` command shows outdated gems (@joelmoss, #1130)
  - Print gem post install messages (@csquared, #1155)
  - Reduce memory use by removing Specification.new inside method_missing (@tenderlove, #1222)
  - Allow `check --path`

## 1.1.pre.4 (May 5, 2011)

Bugfixes:

  - Fix bug that could prevent installing new gems

## 1.1.pre.3 (May 4, 2011)

Features:

  - Add `bundle outdated` to show outdated gems (@joelmoss)
  - Remove BUNDLE_* from `Bundler.with_clean_env` (@wuputah)
  - Add Bundler.clean_system, and clean_exec (@wuputah)
  - Use git config for gem author name and email (@krekoten)

Bugfixes:

  - Fix error calling Bundler.rubygems.gem_path
  - Fix error when Gem.path returns Gem::FS instead of String

## 1.1.pre.2 (April 28, 2011)

Features:

  - Add :github option to Gemfile DSL for easy git repos
  - Merge all fixes from 1.0.12 and 1.0.13

## 1.1.pre.1 (February 2, 2011)

Bugfixes:

  - Compatibility with changes made by Rubygems 1.5

## 1.1.pre (January 21, 2011)

Features:

  - Add bundle clean. Removes unused gems from --path directory
  - Initial Gemcutter Endpoint API work, BAI Fetching source index
  - Added bundle install --standalone
  - Ignore Gemfile.lock when building new gems
  - Make it possible to override a .gemspec dependency's source in the
    Gemfile

Removed:

  - Removed bundle lock
  - Removed bundle install <path>
  - Removed bundle install --production
  - Removed bundle install --disable-shared-gems

## 1.0.21 (September 30, 2011)

  - No changes from RC

## 1.0.21.rc (September 29, 2011)

Bugfixes:

  - Load Psych unless Syck is defined, because 1.9.2 defines YAML

## 1.0.20 (September 27, 2011)

Features:

  - Add platform :maglev (@timfel, #1444)

Bugfixes:

  - Ensure YAML is required even if Psych is found
  - Handle directory names that contain invalid regex characters

## 1.0.20.rc (September 18, 2011)

Features:

  - Rescue interrupts to `bundle` while loading bundler.rb (#1395)
  - Allow clearing without groups by passing `--without ''` (#1259)

Bugfixes:

  - Manually sort requirements in the lockfile (#1375)
  - Remove several warnings generated by ruby -w (@stephencelis)
  - Handle trailing slashes on names passed to `gem` (#1372)
  - Name modules for gems like 'test-foo_bar' correctly (#1303)
  - Don't require Psych if Syck is already loaded (#1239)

## 1.0.19.rc (September 13, 2011)

Features:

  - Compatibility with Rubygems 1.8.10 installer changes
  - Report gem installation failures clearly (@rwilcox, #1380)
  - Useful error for cap and vlad on first deploy (@nexmat, @kirs)

Bugfixes:

  - `exec` now works when the command contains 'exec'
  - Only touch lock after changes on Windows (@robertwahler, #1358)
  - Keep load paths when #setup is called multiple times (@radsaq, #1379)

## 1.0.18 (August 16, 2011)

Bugfixes:

  - Fix typo in DEBUG_RESOLVER (@geemus)
  - Fixes rake 0.9.x warning (@mtylty, #1333)
  - Fix `bundle cache` again for rubygems 1.3.x

Features:

  - Run the bundle install earlier in a Capistrano deployment (@cgriego, #1300)
  - Support hidden gemspec (@trans, @cldwalker, #827)
  - Make fetch_specs faster (@zeha, #1294)
  - Allow overriding development deps loaded by #gemspec (@lgierth, #1245)

## 1.0.17 (August 8, 2011)

Bugfixes:

  - Fix rake issues with rubygems 1.3.x (#1342)
  - Fixed invalid byte sequence error while installing gem on Ruby 1.9 (#1341)

## 1.0.16 (August 8, 2011)

Features:

  - Performance fix for MRI 1.9 (@efficientcloud, #1288)
  - Shortcuts (like `bundle i`) for all commands (@amatsuda)
  - Correcly identify missing child dependency in error message

Bugfixes:

  - Allow Windows network share paths with forward slashes (@mtscout6, #1253)
  - Check for rubygems.org credentials so `rake release` doesn't hang (#980)
  - Find cached prerelease gems on rubygems 1.3.x (@dburt, #1202)
  - Fix `bundle install --without` on kiji (@tmm1, #1287)
  - Get rid of warning in ruby 1.9.3 (@smartinez87, #1231)

Documentation:

  - Documentation for `gem ..., :require => false` (@kmayer, #1292)
  - Gems provide "executables", they are rarely also binaries (@fxn, #1242)

## 1.0.15 (June 9, 2011)

Features:

  - Improved Rubygems integration, removed many deprecation notices

Bugfixes:

  - Escape URL arguments to git correctly on Windows (1.0.14 regression)

## 1.0.14 (May 27, 2011)

Features:

  - Rubinius platform :rbx (@rkbodenner)
  - Include gem rake tasks with "require 'bundler/gem_tasks" (@indirect)
  - Include user name and email from git config in new gemspec (@ognevsky)

Bugfixes:

  - Set file permissions after checking out git repos (@tissak)
  - Remove deprecated call to Gem::SourceIndex#all_gems (@mpj)
  - Require the version file in new gemspecs (@rubiii)
  - Allow relative paths from the Gemfile in gems with no gemspec (@mbirk)
  - Install gems that contain 'bundler', e.g. guard-bundler (@hone)
  - Display installed path correctly on Windows (@tadman)
  - Escape quotes in git URIs (@mheffner)
  - Improve Rake 0.9 support (@quix)
  - Handle certain directories already existing (@raggi)
  - Escape filenames containing regex characters (@indirect)

## 1.0.13 (May 4, 2011)

Features:

  - Compatibility with Rubygems master (soon to be v1.8) (@evanphx)
  - Informative error when --path points to a broken symlink
  - Support Rake 0.9 and greater (@e2)
  - Output full errors for non-TTYs e.g. pow (@josh)

Bugfixes:

  - Allow spaces in gem path names for gem tasks (@rslifka)
  - Have cap run bundle install from release_path (@martinjagusch)
  - Quote git refspec so zsh doesn't expand it (@goneflyin)

## 1.0.12 (April 8, 2011)

Features:

  - Add --no-deployment option to `install` for disabling it on dev machines
  - Better error message when git fails and cache is present (@parndt)
  - Honor :bundle_cmd in cap `rake` command (@voidlock, @cgriego)

Bugfixes:

  - Compatibility with Rubygems 1.7 and Rails 2.3 and vendored gems (@evanphx)
  - Fix changing gem order in lock (@gucki)
  - Remove color escape sequences when displaying man pages (@bgreenlee)
  - Fix creating GEM_HOME on both JRuby 1.5 and 1.6 (@nickseiger)
  - Fix gems without a gemspec and directories in bin/ (@epall)
  - Fix --no-prune option for `bundle install` (@cmeiklejohn)

## 1.0.11 (April 1, 2011)

Features:

  - Compatibility with Rubygems 1.6 and 1.7
  - Better error messages when a git command fails

Bugfixes:

  - Don't always update gemspec gems (@carllerche)
  - Remove ivar warnings (@jackdempsey)
  - Fix occasional git failures in zsh (@jonah-carbonfive)
  - Consistent lock for gems with double deps like Cap (@akahn)

## 1.0.10 (February 1, 2011)

Bugfixes:

  - Fix a regression loading YAML gemspecs from :git and :path gems
  - Requires, namespaces, etc. to work with changes in Rubygems 1.5

## 1.0.9 (January 19, 2011)

Bugfixes:

  - Fix a bug where Bundler.require could remove gems from the load
    path. In Rails apps with a default application.rb, this removed
    all gems in groups other than :default and Rails.env

## 1.0.8 (January 18, 2011)

Features:

  - Allow overriding gemspec() deps with :git deps
  - Add --local option to `bundle update`
  - Ignore Gemfile.lock in newly generated gems
  - Use `less` as help pager instead of `more`
  - Run `bundle exec rake` instead of `rake` in Capistrano tasks

Bugfixes:

  - Fix --no-cache option for `bundle install`
  - Allow Vlad deploys to work without Capistrano gem installed
  - Fix group arguments to `bundle console`
  - Allow groups to be loaded even if other groups were loaded
  - Evaluate gemspec() gemspecs in their directory not the cwd
  - Count on Rake to chdir to the right place in GemHelper
  - Change Pathnames to Strings for MacRuby
  - Check git process exit status correctly
  - Fix some warnings in 1.9.3-trunk (thanks tenderlove)

## 1.0.7 (November 17, 2010)

Bugfixes:

  - Remove Bundler version from the lockfile because it broke
    backwards compatibility with 1.0.0-1.0.5. Sorry. :(

## 1.0.6 (November 16, 2010)

Bugfixes:

  - Fix regression in `update` that caused long/wrong results
  - Allow git gems on other platforms while installing (#579)

Features:

  - Speed up `install` command using various optimizations
  - Significantly increase performance of resolver
  - Use upcoming Rubygems performance improvements (@tmm1)
  - Warn if the lockfile was generated by a newer version
  - Set generated gems' homepage to "", so Rubygems will warn

## 1.0.5 (November 13, 2010)

Bugfixes:

  - Fix regression disabling all operations that employ sudo

## 1.0.4 (November 12, 2010)

Bugfixes:

  - Expand relative :paths from Bundler.root (eg ./foogem)
  - Allow git gems in --without groups while --frozen
  - Allow gem :ref to be a symbol as well as a string
  - Fix exception when Gemfile needs a newer Bundler version
  - Explanation when the current Bundler version conflicts
  - Explicit error message if Gemfile needs newer Bundler
  - Ignore an empty string BUNDLE_GEMFILE
  - Skeleton gemspec now works with older versions of git
  - Fix shell quoting and ref fetching in GemHelper
  - Disable colored output in --deployment
  - Preserve line endings in lock file

Features:

  - Add support for 'mingw32' platform (aka RubyInstaller)
  - Large speed increase when Gemfile.lock is already present
  - Huge speed increase when many (100+) system gems are present
  - Significant expansion of ISSUES, man pages, and docs site
  - Remove Open3 from GemHelper (now it works on Windows™®©)
  - Allow setting roles in built-in cap and vlad tasks

## 1.0.3 (October 15, 2010)

Bugfixes:

  - Use bitwise or in #hash to reduce the chance of overflow
  - `bundle update` now works with :git + :tag updates
  - Record relative :path options in the Gemfile.lock
  - :groups option on gem method in Gemfile now works
  - Add #platform method and :platform option to Gemfile DSL
  - --without now accepts a quoted, space-separated list
  - Installing after --deployment with no lock is now possible
  - Binstubs can now be symlinked
  - Print warning if cache for --local install is missing gems
  - Improve output when installing to a path
  - The tests all pass! Yay!

## 1.0.2 (October 2, 2010)

Bugfix:

  - Actually include the man pages in the gem, so help works

## 1.0.1 (October 1, 2010)

Features:

  - Vlad deployment recipe, `require 'bundler/vlad'`
  - Prettier bundle graphs
  - Improved gem skeleton for `bundle gem`
  - Prompt on file clashes when generating a gem
  - Option to generate binary with gem skeleton
  - Allow subclassing of GemHelper for custom tasks
  - Chdir to gem directory during `bundle open`

Bugfixes:

  - Allow gemspec requirements with a list of versions
  - Accept lockfiles with windows line endings
  - Respect BUNDLE_WITHOUT env var
  - Allow `gem "foo", :platform => :jruby`
  - Specify loaded_from path in fake gemspec
  - Flesh out gem_helper tasks, raise errors correctly
  - Respect RBConfig::CONFIG['ruby_install_name'] in binstubs

## 1.0.0 (August 29, 2010)

Features:

  - You can now define `:bundle_cmd` in the capistrano task

Bugfixes:

  - Various bugfixes to the built-in rake helpers
  - Fix a bug where shortrefs weren't unique enough and were
    therfore colliding
  - Fix a small bug involving checking whether a local git
    clone is up to date
  - Correctly handle explicit '=' dependencies with gems
    pinned to a git source
  - Fix an issue with Windows-generated lockfiles by reading
    and writing the lockfile in binary mode
  - Fix an issue with shelling out to git in Windows by
    using double quotes around paths
  - Detect new Rubygems sources in the Gemfile and update
    the lockfile

## 1.0.0.rc.6 (August 23, 2010)

Features:

  - Much better documentation for most of the commands and Gemfile
    format

Bugfixes:

  - Don't attempt to create directories if they already exist
  - Fix the capistrano task so that it actually runs
  - Update the Gemfile template to reference rubygems.org instead
    of :gemcutter
  - bundle exec should exit with a non zero exit code when the gem
    binary does not exist or the file is not executable.
  - Expand paths in Gemfile relative to the Gemfile and not the current
    working directory.

## 1.0.0.rc.5 (August 10, 2010)

Features:

  - Make the Capistrano task more concise.

Bugfixes:

  - Fix a regression with determining whether or not to use sudo
  - Allow using the --gemfile flag with the --deployment flag

## 1.0.0.rc.4 (August 9, 2010)

Features:

  - `bundle gem NAME` command to generate a new gem with Gemfile
  - Bundle config file location can be specified by BUNDLE_APP_CONFIG
  - Add --frozen to disable updating the Gemfile.lock at runtime
    (default with --deployment)
  - Basic Capistrano task now added as 'bundler/capistrano'

Bugfixes:

  - Multiple bundler process no longer share a tmp directory
  - `bundle update GEM` always updates dependencies of GEM as well
  - Deleting the cache directory no longer causes errors
  - Moving the bundle after installation no longer causes git errors
  - Bundle path is now correctly remembered on a read-only filesystem
  - Gem binaries are installed to Gem.bindir, not #{Gem.dir}/bin
  - Fetch gems from vendor/cache, even without --local
  - Sort lockfile by platform as well as spec

## 1.0.0.rc.3 (August 3, 2010)

Features:

  - Deprecate --production flag for --deployment, since the former
    was causing confusion with the :production group
  - Add --gemfile option to `bundle check`
  - Reduce memory usage of `bundle install` by 2-4x
  - Improve message from `bundle check` under various conditions
  - Better error when a changed Gemfile conflicts with Gemfile.lock

Bugfixes:

  - Create bin/ directory if it is missing, then install binstubs
  - Error nicely on the edge case of a pinned gem with no spec
  - Do not require gems for other platforms
  - Update git sources along with the gems they contain

## 1.0.0.rc.2 (July 29, 2010)

  - `bundle install path` was causing confusion, so we now print
    a clarifying warning. The preferred way to install to a path
    (which will not print the warning) is
    `bundle install --path path/to/install`.
  - `bundle install --system` installs to the default system
    location ($BUNDLE_PATH or $GEM_HOME) even if you previously
    used `bundle install --path`
  - completely remove `--disable-shared-gems`. If you install to
    system, you will not be isolated, while if you install to
    another path, you will be isolated from gems installed to
    the system. This was mostly an internal option whose naming
    and semantics were extremely confusing.
  - Add a `--production` option to `bundle install`:
    - by default, installs to `vendor/bundle`. This can be
      overridden with the `--path` option
    - uses `--local` if `vendor/cache` is found. This will
      guarantee that Bundler does not attempt to connect to
      Rubygems and will use the gems cached in `vendor/cache`
      instead
    - Raises an exception if a Gemfile.lock is not found
    - Raises an exception if you modify your Gemfile in development
      but do not check in an updated Gemfile.lock
  - Fixes a bug where switching a source from Rubygems to git
    would always say "the git source is not checked out" when
    running `bundle install`

NOTE: We received several reports of "the git source has not
been checked out. Please run bundle install". As far as we
can tell, these problems have two possible causes:

1. `bundle install ~/.bundle` in one user, but actually running
   the application as another user. Never install gems to a
   directory scoped to a user (`~` or `$HOME`) in deployment.
2. A bug that happened when changing a gem to a git source.

To mitigate several common causes of `(1)`, please use the
new `--production` flag. This flag is simply a roll-up of
the best practices we have been encouraging people to use
for deployment.

If you want to share gems across deployments, and you use
Capistrano, symlink release_path/current/vendor/bundle to
release_path/shared/bundle. This will keep deployments
snappy while maintaining the benefits of clean, deploy-time
isolation.

## 1.0.0.rc.1 (July 26, 2010)

  - Fixed a bug with `bundle install` on multiple machines and git

## 1.0.0.beta.10 (July 25, 2010)

  - Last release before 1.0.0.rc.1
  - Added :mri as a valid platform (platforms :mri { gem "ruby-debug" })
  - Fix `bundle install` immediately after modifying the :submodule option
  - Don't write to Gemfile.lock if nothing has changed, fixing situations
    where bundle install was run with a different user than the app
    itself
  - Fix a bug where other platforms were being wiped on `bundle update`
  - Don't ask for root password on `bundle install` if not needed
  - Avoid setting `$GEM_HOME` where not needed
  - First solid pass of `bundle config`
  - Add build options
    - `bundle config build.mysql --with-mysql-config=/path/to/config`

## 1.0.0.beta.9 (July 21, 2010)

  - Fix install failure when switching from a path to git source
  - Fix `bundle exec bundle *` in a bundle with --disable-shared-gems
  - Fix `bundle *` from inside a bundle with --disable-shared-gem
  - Shim Gem.refresh. This is used by Unicorn
  - Fix install failure when a path's dependencies changed

## 1.0.0.beta.8 (July 20, 2010)

  - Fix a Beta 7 bug involving Ruby 1.9

## 1.0.0.beta.7 (July 20, 2010, yanked)

  - Running `bundle install` twice in a row with a git source always crashed

## 1.0.0.beta.6 (July 20, 2010, yanked)

  - Create executables with bundle install --binstubs
  - You can customize the location (default is app/bin) with --binstubs other/location
  - Fix a bug where the Gemfile.lock would be deleted even if the update was exited
  - Fix a bug where cached gems for other platforms were sometimes deleted
  - Clean up output when nothing was deleted from cache (it previously said
    "Removing outdated gems ...")
  - Improve performance of bundle install if the git gem was already checked out,
    and the revision being used already exists locally
  - Fix bundle show bundler in some cases
  - Fix bugs with bundle update
  - Don't ever run git commands at runtime (fixes a number of common passenger issues)
  - Fixes an obscure bug where switching the source of a gem could fail to correctly
    change the source of its dependencies
  - Support multiple version dependencies in the Gemfile
    (gem "rails", ">= 3.0.0.beta1", "<= 3.0.0")
  - Raise an exception for ambiguous uses of multiple declarations of the same gem
    (for instance, with different versions or sources).
  - Fix cases where the same dependency appeared several times in the Gemfile.lock
  - Fix a bug where require errors were being swallowed during Bundler.require

## 1.0.0.beta.1

  - No `bundle lock` command. Locking happens automatically on install or update
  - No .bundle/environment.rb. Require 'bundler/setup' instead.
  - $BUNDLE_HOME defaults to $GEM_HOME instead of ~/.bundle
  - Remove lockfiles generated by 0.9

## 0.9.26

Features:

  - error nicely on incompatible 0.10 lockfiles

## 0.9.25 (May 3, 2010)

Bugfixes:

  - explicitly coerce Pathname objects to Strings for Ruby 1.9
  - fix some newline weirdness in output from install command

## 0.9.24 (April 22, 2010)

Features:

  - fetch submodules for git sources
  - limit the bundled version of bundler to the same as the one installing
  - force relative paths in git gemspecs to avoid raising Gem::NameTooLong
  - serialize GemCache sources correctly, so locking works
  - raise Bundler::GemNotFound instead of calling exit! inside library code
  - Rubygems 1.3.5 compatibility for the adventurous, not supported by me :)

Bugfixes:

  - don't try to regenerate environment.rb if it is read-only
  - prune outdated gems with the platform "ruby"
  - prune cache without errors when there are directories or non-gem files
  - don't re-write environment.rb if running after it has been loaded
  - do not monkeypatch Specification#load_paths twice when inside a bundle

## 0.9.23 (April 20, 2010)

Bugfixes:

  - cache command no longer prunes gems created by an older rubygems version
  - cache command no longer prunes gems that are for other platforms

## 0.9.22 (April 20, 2010)

Features:

  - cache command now prunes stale .gem files from vendor/cache
  - init --gemspec command now generates development dependencies
  - handle Polyglot's changes to Kernel#require with Bundler::ENV_LOADED (#287)
  - remove .gem files generated after installing a gem from a :path (#286)
  - improve install/lock messaging (#284)

Bugfixes:

  - ignore cached gems that are for another platform (#288)
  - install Windows gems that have no architecture set, like rcov (#277)
  - exec command while locked now includes the bundler lib in $LOAD_PATH (#293)
  - fix the `rake install` task
  - add GemspecError so it can be raised without (further) error (#292)
  - create a parent directory before cloning for git 1.5 compatibility (#285)

## 0.9.21 (April 16, 2010)

Bugfixes:

  - don't raise 'omg wtf' when lockfile is outdated

## 0.9.20 (April 15, 2010)

Features:

  - load YAML format gemspecs
  - no backtraces when calling Bundler.setup if gems are missing
  - no backtraces when trying to exec a file without the executable bit

Bugfixes:

  - fix infinite recursion in Bundler.setup after loading a bundled Bundler gem
  - request install instead of lock when env.rb is out of sync with Gemfile.lock

## 0.9.19 (April 12, 2010)

Features:

  - suggest `bundle install --relock` when the Gemfile has changed (#272)
  - source support for Rubygems servers without prerelease gem indexes (#262)

Bugfixes:

  - don't set up all groups every time Bundler.setup is called while locked (#263)
  - fix #full_gem_path for git gems while locked (#268)
  - eval gemspecs at the top level, not inside the Bundler class (#269)


## 0.9.18 (April 8, 2010)

Features:

  - console command that runs irb with bundle (and optional group) already loaded

Bugfixes:

  - Bundler.setup now fully disables system gems, even when unlocked (#266, #246)
    - fixes Yard, which found plugins in Gem.source_index that it could not load
    - makes behaviour of `Bundler.require` consistent between locked and unlocked loads

## 0.9.17 (April 7, 2010)

Features:

  - Bundler.require now calls Bundler.setup automatically
  - Gem::Specification#add_bundler_dependencies added for gemspecs

Bugfixes:

  - Gem paths are not longer duplicated while loading bundler
  - exec no longer duplicates RUBYOPT if it is already set correctly

## 0.9.16 (April 3, 2010)

Features:

  - exit gracefully on INT signal
  - resolver output now indicates whether remote sources were checked
  - print error instead of backtrace when exec cannot find a binary (#241)

Bugfixes:

  - show, check, and open commands work again while locked (oops)
  - show command for git gems
    - outputs branch names other than master
    - gets the correct sha from the checkout
    - doesn't print sha twice if :ref is set
  - report errors from bundler/setup.rb without backtraces (#243)
  - fix Gem::Spec#git_version to not error on unloaded specs
  - improve deprecation, Gemfile, and command error messages (#242)

## 0.9.15 (April 1, 2010)

Features:

  - use the env_file if possible instead of doing a runtime resolve
     - huge speedup when calling Bundler.setup while locked
     - ensures bundle exec is fast while locked
     - regenerates env_file if it was generated by an older version
  - update cached/packed gems when you update gems via bundle install

Bugfixes:

  - prep for Rubygems 1.3.7 changes
  - install command now pulls git branches correctly (#211)
  - raise errors on invalid options in the Gemfile

## 0.9.14 (March 30, 2010)

Features:

  - install command output vastly improved
    - installation message now accurate, with 'using' and 'installing'
    - bundler gems no longer listed as 'system gems'
  - show command output now includes sha and branch name for git gems
  - init command now takes --gemspec option for bootstrapping gem Gemfiles
  - Bundler.with_clean_env for shelling out to ruby scripts
  - show command now aliased as 'list'
  - VISUAL env var respected for GUI editors

Bugfixes:

  - exec command now finds binaries from gems with no gemspec
  - note source of Gemfile resolver errors
  - don't blow up if git urls are changed

## 0.9.13 (March 23, 2010)

Bugfixes:

  - exec command now finds binaries from gems installed via :path
  - gem dependencies are pulled in even if their type is nil
  - paths with spaces have double-quotes to work on Windows
  - set GEM_PATH in environment.rb so generators work with Rails 2

## 0.9.12 (March 17, 2010)

  - refactoring, internal cleanup, more solid specs

Features:

  - check command takes a --without option
  - check command exits 1 if the check fails

Bugfixes:

  - perform a topological sort on resolved gems (#191)
  - gems from git work even when paths or repos have spaces (#196)
  - Specification#loaded_from returns a String, like Gem::Specification (#197)
  - specs eval from inside the gem directory, even when locked
  - virtual gemspecs are now saved in environment.rb for use when loading
  - unify the Installer's local index and the runtime index (#204)

## 0.9.11 (March 9, 2010)

  - added roadmap with future development plans

Features:

  - install command can take the path to the gemfile with --gemfile (#125)
  - unknown command line options are now rejected (#163)
  - exec command hugely sped up while locked (#177)
  - show command prints the install path if you pass it a gem name (#148)
  - open command edits an installed gem with $EDITOR (#148)
  - Gemfile allows assigning an array of groups to a gem (#114)
  - Gemfile allows :tag option on :git sources
  - improve backtraces when a gemspec is invalid
  - improve performance by installing gems from the cache if present

Bugfixes:

  - normalize parameters to Bundler.require (#153)
  - check now checks installed gems rather than cached gems (#162)
  - don't update the gem index when installing after locking (#169)
  - bundle parenthesises arguments for 1.8.6 (#179)
  - gems can now be assigned to multiple groups without problems (#135)
  - fix the warning when building extensions for a gem from git with Rubygems 1.3.6
  - fix a Dependency.to_yaml error due to accidentally including sources and groups
  - don't reinstall packed gems
  - fix gems with git sources that are private repositories

## 0.9.10 (March 1, 2010)

  - depends on Rubygems 1.3.6

Bugfixes:

  - support locking after install --without
  - don't reinstall gems from the cache if they're already in the bundle
  - fixes for Ruby 1.8.7 and 1.9

## 0.9.9 (February 25, 2010)

Bugfixes:

  - don't die if GEM_HOME is an empty string
  - fixes for Ruby 1.8.6 and 1.9

## 0.9.8 (February 23, 2010)

Features:

  - pack command which both caches and locks
  - descriptive error if a cached gem is missing
  - remember the --without option after installing
  - expand paths given in the Gemfile via the :path option
  - add block syntax to the git and group options in the Gemfile
  - support gems with extensions that don't admit they depend on rake
  - generate gems using gem build gemspec so git gems can have native extensions
  - print a useful warning if building a gem fails
  - allow manual configuration via BUNDLE_PATH

Bugfixes:

  - eval gemspecs in the gem directory so relative paths work
  - make default spec for git sources valid
  - don't reinstall gems that are already packed

## 0.9.7 (February 17, 2010)

Bugfixes:

  - don't say that a gem from an excluded group is "installing"
  - improve crippling rubygems in locked scenarios

## 0.9.6 (February 16, 2010)

Features:

  - allow String group names
  - a number of improvements in the documentation and error messages

Bugfixes:

  - set SourceIndex#spec_dirs to solve a problem involving Rails 2.3 in unlocked mode
  - ensure Rubygems is fully loaded in Ruby 1.9 before patching it
  - fix `bundle install` for a locked app without a .bundle directory
  - require gems in the order that the resolver determines
  - make the tests platform agnostic so we can confirm that they're green on JRuby
  - fixes for Ruby 1.9

## 0.9.5 (February 12, 2010)

Features:

  - added support for :path => "relative/path"
  - added support for older versions of git
  - added `bundle install --disable-shared-gems`
  - Bundler.require fails silently if a library does not have a file on the load path with its name
  - Basic support for multiple rubies by namespacing the default bundle path using the version and engine

Bugfixes:

  - if the bundle is locked and .bundle/environment.rb is not present when Bundler.setup is called, generate it
  - same if it's not present with `bundle check`
  - same if it's not present with `bundle install`

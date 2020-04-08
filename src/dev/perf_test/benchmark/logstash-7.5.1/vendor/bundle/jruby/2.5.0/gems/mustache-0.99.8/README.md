Mustache
=========

Inspired by [ctemplate][1] and [et][2], Mustache is a
framework-agnostic way to render logic-free views.

As ctemplates says, "It emphasizes separating logic from presentation:
it is impossible to embed application logic in this template language."

For a list of implementations (other than Ruby) and tips, see
<http://mustache.github.io/>.


Overview
--------

Think of Mustache as a replacement for your views. Instead of views
consisting of ERB or HAML with random helpers and arbitrary logic,
your views are broken into two parts: a Ruby class and an HTML
template.

We call the Ruby class the "view" and the HTML template the
"template."

All your logic, decisions, and code is contained in your view. All
your markup is contained in your template. The template does nothing
but reference methods in your view.

This strict separation makes it easier to write clean templates,
easier to test your views, and more fun to work on your app's front end.


Why?
----

I like writing Ruby. I like writing HTML. I like writing JavaScript.

I don't like writing ERB, Haml, Liquid, Django Templates, putting Ruby
in my HTML, or putting JavaScript in my HTML.


Usage
-----

Quick example:

    >> require 'mustache'
    => true
    >> Mustache.render("Hello {{planet}}", :planet => "World!")
    => "Hello World!"

We've got an `examples` folder but here's the canonical one:

    class Simple < Mustache
      def name
        "Chris"
      end

      def value
        10_000
      end

      def taxed_value
        value * 0.6
      end

      def in_ca
        true
      end
    end

We simply create a normal Ruby class and define methods. Some methods
reference others, some return values, some return only booleans.

Now let's write the template:

    Hello {{name}}
    You have just won {{value}} dollars!
    {{#in_ca}}
    Well, {{taxed_value}} dollars, after taxes.
    {{/in_ca}}

This template references our view methods. To bring it all together,
here's the code to render actual HTML;

    Simple.render

Which returns the following:

    Hello Chris
    You have just won 10000 dollars!
    Well, 6000.0 dollars, after taxes.

Simple.


Tag Types
---------

For a language-agnostic overview of Mustache's template syntax, see
the `mustache(5)` manpage or
<http://mustache.github.io/mustache.5.html>.


Escaping
--------

Mustache does escape all values when using the standard double
Mustache syntax. Characters which will be escaped: `& \ " < >` (as 
well as `'` in Ruby `>= 2.0`). To disable escaping, simply use triple
mustaches like `{{{unescaped_variable}}}`.

Example: Using `{{variable}}` inside a template for `5 > 2` will
result in `5 &gt; 2`, where as the usage of `{{{variable}}}` will
result in `5 > 2`.


Dict-Style Views
----------------

ctemplate and friends want you to hand a dictionary to the template
processor. Mustache supports a similar concept. Feel free to mix the
class-based and this more procedural style at your leisure.

Given this template (winner.mustache):

    Hello {{name}}
    You have just won {{value}} bucks!

We can fill in the values at will:

    view = Winner.new
    view[:name] = 'George'
    view[:value] = 100
    view.render

Which returns:

    Hello George
    You have just won 100 bucks!

We can re-use the same object, too:

    view[:name] = 'Tony'
    view.render
    Hello Tony
    You have just won 100 bucks!


Templates
---------

A word on templates. By default, a view will try to find its template
on disk by searching for an HTML file in the current directory that
follows the classic Ruby naming convention.

    TemplatePartial => ./template_partial.mustache

You can set the search path using `Mustache.template_path`. It can be set on a
class by class basis:

    class Simple < Mustache
      self.template_path = File.dirname(__FILE__)
      ... etc ...
    end

Now `Simple` will look for `simple.mustache` in the directory it resides
in, no matter the cwd.

If you want to just change what template is used you can set
`Mustache.template_file` directly:

    Simple.template_file = './blah.mustache'

Mustache also allows you to define the extension it'll use.

    Simple.template_extension = 'xml'

Given all other defaults, the above line will cause Mustache to look
for './blah.xml'

Feel free to set the template directly:

    Simple.template = 'Hi {{person}}!'

Or set a different template for a single instance:

    Simple.new.template = 'Hi {{person}}!'

Whatever works.


Views
-----

Mustache supports a bit of magic when it comes to views. If you're
authoring a plugin or extension for a web framework (Sinatra, Rails,
etc), check out the `view_namespace` and `view_path` settings on the
`Mustache` class. They will surely provide needed assistance.


Helpers
-------

What about global helpers? Maybe you have a nifty `gravatar` function
you want to use in all your views? No problem.

This is just Ruby, after all.

    module ViewHelpers
      def gravatar
        gravatar_id = Digest::MD5.hexdigest(self[:email].to_s.strip.downcase)
        gravatar_for_id(gravatar_id)
      end

      def gravatar_for_id(gid, size = 30)
        "#{gravatar_host}/avatar/#{gid}?s=#{size}"
      end

      def gravatar_host
        @ssl ? 'https://secure.gravatar.com' : 'http://www.gravatar.com'
      end
    end

Then just include it:

    class Simple < Mustache
      include ViewHelpers

      def name
        "Chris"
      end

      def value
        10_000
      end

      def taxed_value
        value * 0.6
      end

      def in_ca
        true
      end

      def users
        User.all
      end
    end

Great, but what about that `@ssl` ivar in `gravatar_host`? There are
many ways we can go about setting it.

Here's an example which illustrates a key feature of Mustache: you
are free to use the `initialize` method just as you would in any
normal class.

    class Simple < Mustache
      include ViewHelpers

      def initialize(ssl = false)
        @ssl = ssl
      end

      ... etc ...
    end

Now:

    Simple.new(request.ssl?).render

Finally, our template might look like this:

    <ul>
      {{# users}}
        <li><img src="{{ gravatar }}"> {{ login }}</li>
      {{/ users}}
    </ul>


Sinatra
-------

Mustache ships with Sinatra integration. Please see
`lib/mustache/sinatra.rb` or
<https://github.com/defunkt/mustache/blob/master/lib/mustache/sinatra.rb>
for complete documentation.

An example Sinatra application is also provided:
<https://github.com/defunkt/mustache-sinatra-example>

If you are upgrading to Sinatra 1.0 and Mustache 0.9.0+ from Mustache
0.7.0 or lower, the settings have changed. But not that much.

See [this diff](https://gist.github.com/defunkt/345490) for what you need to
do. Basically, things are named properly now and all should be
contained in a hash set using `set :mustache, hash`.


[Rack::Bug][4]
--------------

Mustache also ships with a `Rack::Bug` panel. In your `config.ru` add
the following code:

    require 'rack/bug/panels/mustache_panel'
    use Rack::Bug::MustachePanel

Using Rails? Add this to your initializer or environment file:

    require 'rack/bug/panels/mustache_panel'
    config.middleware.use "Rack::Bug::MustachePanel"

[![Rack::Bug](http://img.skitch.com/20091027-xyf4h1yxnefpp7usyddrcmc7dn.png)][5]


Vim
---

vim-mustache-handlebars is available at https://github.com/mustache/vim-mustache-handlebars

Emacs
-----

mustache-mode.el is available at https://github.com/mustache/emacs


TextMate
--------

[Mustache.tmbundle](https://github.com/defunkt/Mustache.tmbundle)

See <https://gist.github.com/defunkt/323624> for installation instructions.


Command Line
------------

See `mustache(1)` man page or
<http://mustache.github.io/mustache.1.html>
for command line docs.


Installation
------------

### [RubyGems](http://rubygems.org/)

    $ gem install mustache


Acknowledgements
----------------

Thanks to [Tom Preston-Werner](https://github.com/mojombo) for showing
me ctemplate and [Leah Culver](https://github.com/leah) for the name "Mustache."

Special thanks to [Magnus Holm](http://judofyr.net/) for all his
awesome work on Mustache's parser.


Contributing
------------

Once you've made your great commits:

1. [Fork][fk] Mustache
2. Create a topic branch - `git checkout -b my_branch`
3. Push to your branch - `git push origin my_branch`
4. Create an [Issue][is] with a link to your branch
5. That's it!

You might want to checkout Resque's [Contributing][cb] wiki page for information
on coding standards, new features, etc.


Mailing List
------------

To join the list simply send an email to <mustache@librelist.com>. This
will subscribe you and send you information about your subscription,
including unsubscribe information.

The archive can be found at <http://librelist.com/browser/>.


Meta
----

* Code: `git clone https://github.com/defunkt/mustache.git`
* Home: <http://mustache.github.io>
* Bugs: <https://github.com/defunkt/mustache/issues>
* List: <mustache@librelist.com>
* Gems: <http://rubygems.org/gems/mustache>

You can also find us in `#{` on irc.freenode.net.

[1]: http://code.google.com/p/google-ctemplate/
[2]: http://www.ivan.fomichev.name/2008/05/erlang-template-engine-prototype.html
[3]: http://google-ctemplate.googlecode.com/svn/trunk/doc/howto.html
[4]: https://github.com/brynary/rack-bug/
[5]: http://img.skitch.com/20091027-n8pxwwx8r61tc318a15q1n6m14.png
[cb]: http://wiki.github.com/defunkt/resque/contributing
[fk]: http://help.github.com/forking/
[is]: https://github.com/defunkt/mustache/issues

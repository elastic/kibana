# insist { on readable assertions }

I like rspec, but I don't like the '#should' junk. It scratches me the wrong
way, I guess. I find this to be an unreadable mess:

    # yuck, if you ask me.
    somevalue.should eq(0)

On the flip side, I really like the idea (make tests read like english).

So instead of slapping '#should' on all objects and doing weird stuff like
`expect { block }.to raise_error(thing)`, I just use blocks for everything in a
kind of lazy-evaluation wrapping:

    # Check equality
    insist { value } == 30

    # Insist an exception is raised
    insist { code }.raises(exception_class)

Reads well, I think.

## Most minimal assertions possible

Using rspec's 'subject' stuff, you can write tests that are perhaps even more minimal while still being clear.

Here's an example test that fails. The subject is an 'insist' object, so you
can just do the usual '==' and other methods on it:

    # spec/example_spec.rb
    describe "thing" do
      subject { insist { "whoa!" } }

      it "should be, like, awesome!" do
        subject == "awesome!"
      end
    end

Running it:

    Failures:

      1) thing should be, like, awesome!
         Failure/Error: subject == "awesome!"
         Insist::Failure:
           Expected "awesome!", but got "whoa!"
         # ./lib/insist/assert.rb:8:in `assert'
         # ./lib/insist/comparators.rb:12:in `=='
         # ./test.rb:5:in `block (2 levels) in <top (required)>'

    Finished in 0.00208 seconds
    1 example, 1 failure

    Failed examples:

    rspec ./test.rb:4 # thing should be, like, awesome!


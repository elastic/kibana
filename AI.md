# AI-Assisted Contributions to Kibana

AI tools are part of how a lot of us write software now, and that's completely fine. We use them too. If a coding assistant helped you understand a corner of the codebase, draft a fix, or write a test, you're in good company and your contribution is welcome here.

What follows isn't a set of rules about which tools you're allowed to use. It's about the kind of contributions that work well in a codebase this size, and how to make sure the time you spend turns into something we can actually merge.

## Talk to us before you build

The single most useful thing you can do is start a conversation early. Open an issue describing what you want to change, or comment on an existing one to say you're picking it up. A short note about your intended approach gives us a chance to point you at the right files, flag anything you'd otherwise trip over, and confirm the change is something we want.

This matters because Kibana is large and full of context that isn't obvious from the outside. A fix that looks clean in isolation might conflict with work already underway, or sit in an area we're about to rewrite. A large pull request that arrives with no prior discussion is hard for everyone. We'd have to reverse-engineer your intent, and you may have spent hours on something we can't take. A two-line comment up front usually saves both sides a lot of trouble.

## Keep the change focused

The contributions that go smoothly tend to be the ones you can hold in your head all at once. A specific bug fix, a documentation correction, a missing test, an accessibility improvement. Something with a clear before and after that you can validate end to end on your own machine.

Sprawling changes that touch many areas are much harder to review and much easier to get subtly wrong. When in doubt, make the change smaller. A tightly scoped pull request that does one thing well is far more likely to merge than an ambitious one that does five things approximately.

## Understand what you're submitting

Read your own diff before you ask anyone else to. Run the code. Make sure the tests pass, and add tests when you're changing behavior. You should be able to explain the reasoning behind every line you're proposing, and if there's a change you can't account for, treat that as a signal to slow down and dig in rather than something to wave through.

This is really the heart of it. AI is a wonderful force multiplier for work you understand. It's a poor substitute for understanding you don't have. Use it to move faster on problems you can reason about, not to generate code you can't evaluate. Once you open a pull request, that code is yours, and you're responsible for its correctness regardless of how it was written.

## Keep the conversation genuine

When you're discussing a change with maintainers, write to us as yourself. Please don't paste model-generated text straight into issue threads or pull request reviews. It tends to be obvious, it slows the discussion down, and it chips away at the trust that makes collaboration work. A short, honest reply in your own words is worth far more than a polished wall of generated prose.

## Why we're asking

Every pull request gets a careful read from a real person, and that attention is a finite resource. A steady stream of large, low-effort changes, submitted without testing or understanding, pulls that attention away from the contributors who did the work. So we'll be direct: a contribution that shows no sign of understanding or testing will be closed, even if the code happens to run.

None of this is meant to discourage you. We're spelling it out precisely because we want your contributions and we want them to succeed. Engage early, keep it focused, understand what you're sending, and be yourself in the conversation. Do that and you'll find Kibana a genuinely rewarding project to work on. We're glad you're here.

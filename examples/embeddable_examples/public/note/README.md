The `../todo` folder has two separate examples: a "by reference" and a "by value" todo embeddable example.
This folder combines both examples into a single embeddable, but since we can only have one embeddable factory
represent a single saved object type, this is built off a `note` saved object type. There is more complexity
invovled in making
it a single embeddable - it not only takes in an optional saved object id but can also accept edits to
the values.  This is closer to the real world use case we aim for with the Visualize Library.  A user
may have an embeddable on a dashboard that is "by value" but they would like to promote it to "by reference".

Similarly they could break the link and convert back from by reference to by value.

The input data is:

```ts
{
  savedObjectId?: string;
  attributes: NoteSavedObjectAttributes;
}
```

`attributes` represent either the "by value" data, or, edits on top of the saved object id.

The output data is:

```ts
{
  savedAttributes?: NoteSavedObjectAttributes;
}
```

There is also an action that represents how this setup can be used with a save/create/edit action.

You can only have one embeddable factory representation for a single saved object, so rather than use the
`Todo` example, this is going to use a new embeddable - `note`.
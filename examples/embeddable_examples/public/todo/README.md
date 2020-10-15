There are two examples in here:
 - TodoEmbeddable
 - TodoRefEmbeddable

 # TodoEmbeddable

 The first example you should review is the HelloWorldEmbeddable.  That is as basic an embeddable as you can get.
 This embeddable is the next step up - an embeddable that renders dynamic input data. The data is simple: 
  - a required task string
  - an optional title
  - an optional icon string
  - an optional search string

It also has output data, which is `hasMatch` - whether or not the search string has matched any input data.

`hasMatch` is a better fit for output data than input data, because it's state that is _derived_ from input data.

For example, if it was input data, you could create a TodoEmbeddable with input like this:

```ts
 todoEmbeddableFactory.create({ task: 'take out the garabage', search: 'garbage', hasMatch: false });
```

That's wrong because there is actually a match from the search string inside the task.

The TodoEmbeddable component itself doesn't do anything with the `hasMatch` variable other than set it, but
if you check out `SearchableListContainer`, you can see an example where this output data is being used.

## TodoRefEmbeddable

This is an example of an embeddable based off of a saved object. The input is just the `savedObjectId` and
the `search` string. It has even more output parameters, and this time, it does read it's own output parameters in
order to calculate `hasMatch`.

Output:
```ts
{ 
  hasMatch: boolean,
  savedAttributes?: TodoSavedAttributes
}
```

`savedAttributes` is optional because it's possible a TodoSavedObject could not be found with the given savedObjectId.

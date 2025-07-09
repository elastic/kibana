# Spacetime notes

Already had a PR open: https://github.com/elastic/kibana/pull/221226. I might overwrite that or start a new one.

## Making the errors go away

Starting new, getting "dataView.fields.getByName is not a function". I'm using `buildDataViewMock` but maybe there's something where an object is frozen and when the mock adds methods to the fields array it's not working in Storybook.

Ok, got things working with some of the mocks and have minimal spans. Now need to clean up story, maybe put some things in decorators.

## Jest testing

Check out what Irene did on the other thing https://github.com/elastic/kibana/pull/226727/files#diff-f68abee5edc62849b5a491e189abc9884982e4b69f434b00aee2423eb99dfaf5

- [ ] mock out duration
- [ ] mock out trace
- [ ] jest testing
- [ ] pastable payload
- [ ] logs
- [x] attributes
- [ ] interaction testing

# MultiContent

## The problem

Building resource creations/edition flows in the UI, that have multiple contents that need to be merged together at the end of the flow and at the same time keeping a reference of each content state, is not trivial. Indeed, when we switch tab or we go to the next step, the old step data needs to be saved somewhere.

The first thing that comes to mind is: "Ok, I'll lift the state up" and make each step "content" a controlled component (when its value changes, it sends it to the global state and then it receives it back as prop). This works well up to a certain point. What happens if the internal state that the step content works with, is not the same as the outputted state?

Something like this:

```js
// StepOne internal state, flat map of fields
const internalState: {
  fields: {
    ate426jn: { name: 'hello', value: 'world', parent: 'rwtsdg3' },
    rwtsdg3: { name: 'myObject', type: 'object' },
  }
}

// Outputed data

const output = {
  stepOne: {
    myObject: {
      hello: 'world'
    }
  }
}
```

We need some sort of serializer to go from the internal state to the output object. If we lift the state up this means that the global state needs to be aware of the intrinsic of the content, leaking implementation details.
This also means that the content **can't be a reusable component** as it depends on an external state to do part of its work (think: the mappings editor).

This is where `MultiContent` comes into play. It lets us declare `content` objects and automatically saves a snapshot of their content when the component unmounts (which occurs when switching a tab for example). If we navigate back to the tab, the tab content gets its `defaultValue` from that cache state.

Let see it through a concrete example

```js
// my_comp_wrapper.tsx

// Always good to have an interface for our contents
interface MyMultiContent {
  contentOne: { myField: string };
  contentTwo: { anotherField: string };
  contentThree: { yetAnotherField: boolean };
}

// Each content data will be a slice of the multi-content defaultValue
const defaultValue: MyMultiContent = {
  contentOne: {
    myField: 'value',
  },
  contentTwo: {
    anotherField: 'value',
  },
  contentThree: {
    yetAnotherField: true,
  },
};
```

```js
// my_comp.tsx

/**
 * We wrap our component with the HOC that will provide the <MultiContentProvider /> and let us use the "useMultiContentContext()" hook
 * 
 * MyComponent connects to the multi-content context and renders each step
 * content without worrying about their internal state.
 */
const MyComponent = WithMultiContent(() => {
  const { validation, getData, validate } = useMultiContentContext<MyMultiContent>();

  const totalSteps = 3;
  const [currentStep, setCurrentStep] = useState(0);

  const renderContent = () => {
    switch (currentStep) {
      case 0:
        return <ContentOneContainer />;
      case 1:
        return <ContentTwoContainer />;
      case 2:
        return <ContentThreeContainer />;
    }
  };

  const onNext = () => {
    // Validate the multi content
    const isValid = await validate();

    if (!isValid) {
      return;
    }

    if (currentStep < totalSteps - 1) {
      // Navigate to the next content
      setCurrentStep((curentStep += 1));
    } else {
      // On last step we need to save so we read the multi-content data
      console.log('About to save:', getData());
    }
  };

  return (
    <>
      {renderContent()}

      {/* Each content validity is accessible from the `validation.contents` object */}
      <EuiButton onClick={onNext} disabled={validation.contents[currentStep] === false}>
        Next
      </EuiButton>
    </>
  );
});
```

```js
// content_one_container.tsx

// From the good old days of Redux, it is a good practice to separate the connection to the multi-content
// from the UI that is rendered.
const ContentOneContainer = () => {

  // Declare a new content and get its default Value + a handler to update the content in the multi-content
  // This will update the "contentOne" slice of the multi-content.
  const { defaultValue, updateContent } = useContent<MyMultiContent>('contentOne');

  return <ContentOne defaultValue={defaultValue} onChange={updateContent} />
};
```

```js
// content_one.tsx

const ContentOne = ({ defaultValue, onChange }) => {
  // Use the defaultValue as a starting point for the internal state
  const [internalStateValue, setInternalStateValue] = useState(defaultValue.myField);

  useEffect(() => {
    // Update the multi content state for this content
    onChange({
      isValid: true, // because in this example it is always valid
      validate: async () => true,
      getData: () => ({
        myField: internalStateValue,
      }),
    });
  }, [internalStateValue]);

  return (
    <input value={internalStateValue} onChange={(e) => setInternalStateValue(e.target.value)} />
  );
}
```

And just like that, `<ContentOne />` is a reusable component that gets a `defaultValue` object and an `onChange` handler to communicate any internal state changes. He is responsible to provide a `getData()` handler as part of the `onChange` that will do any necessary serialization and sanitization, and the outside world does not need to know about it.
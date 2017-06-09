# React Style Guide

### Prefer Stateless functional components where possible.
Stateless function components are more concise, and there are plans for react to increase performance of them.
Good:
```
export function KuiButton({ onClick, isDisabled }) {
  return <button className="kuiButton" onClick={onClick} isDisabled={isDisabled}/>
};
```
Bad:
```
export class KuiButton extends React.Component {
  render() {
    const { onClick, isDisabled } = this.props;
    return <button className="kuiButton" onClick={onClick} isDisabled={isDisabled}/>
  }
}
```

### When state is involved, use ES6 style React Classes over ES5.
Good:
```
export class ClickCounter extends React.Component {
  state = { clickCount: 0 };

  onClick = () => {
    this.setState(prevState => ({
      clickCount: prevState.clickCount + 1
    }));
  }

  render() {
    return <button className="kuiButton" onClick={this.onClick}/>
  }
}
```
Bad:
```
 export const ClickCounter = React.createClass({
  getInitialState() {
    return {
      clickCount: 0
    };
  },
  onClick() {
    this.setState(prevState => ({
      clickCount: prevState.clickCount + 1
    }));
  },
  render() {
    return <button className="kuiButton" onClick={this.onClick}/>
  }
});
```

### When a state change only involves the previous state, pass setState a function instead of an object.
https://facebook.github.io/react/docs/react-component.html#setstate

Good:
```
 this.setState(prevState => ({
   clickCount: prevState.clickCount + 1
 }));
```

Bad:
```
  this.setState({ clickCount: this.state.clickCount++ });
```

### Prefer reactDirective over react-component
reactDirective and react-component are two different ways of embedding react in angular. Using `react-component` means adding a bunch of components into angular, while `reactDirective` keeps them isolated, and is also a more sucinct syntax.

Good:
```
<hello-component fname="person.fname" lname="person.lname" watch-depth="reference"></hello-component>
```
Bad:
```
<react-component name="HelloComponent" props="person" watch-depth="reference"/>
```

### Prefix ui_framework elements with kui, but not their file names.
Good:
```
button.js:
export function KuiButton({ onClick, isDisabled }) {
  return <button className="kuiButton" onClick={onClick} isDisabled={isDisabled}/>
};
```
Bad:
```
button.js:
export class Button extends React.Component {
  render() {
    const { onClick, isDisabled } = this.props;
    return <button className="kuiButton" onClick={onClick} isDisabled={isDisabled}/>
  }
}
```
The filenames leave it off because snake casing already increases file name length.

### Action function names and prop function names

Name action functions in the form of a strong verb and passed properties in the form of on<Subject><Change>. E.g:
```
<sort-button onClick={action.sort}/>
<pagerButton onPageNext={action.turnToNextPage} />
```

### Avoid creating a function and passing that as a property, in render functions.
Best (relies on [stage 2 proposal](https://github.com/tc39/proposal-class-public-fields)):
```
export class ClickCounter extends React.Component {
  state = { clickCount: 0 };

  // This syntax ensures `this` is bound within handleClick
  onClick = () => {
    this.setState(prevState => { clickCount: prevState.clickCount + 1 });
  }

  render() {
    return <button className="kuiButton" onClick={this.onClick} />
  }
}
```
Good:
```
export class ClickCounter extends React.Component {
  constructor() {
    this.state = { clickCount: 0 };
    this.onClick = this.onClick.bind(this);
  }

  onClick() {
    this.setState(prevState => { clickCount: prevState.clickCount + 1 });
  }

  render() {
    return <button className="kuiButton" onClick={this.onClick}/>
  }
}
```

Bad:
```
export class ClickCounter extends React.Component {
  state = { clickCount: 0 };

  onClick() {
    this.setState(prevState => { clickCount: prevState.clickCount + 1 });
  }

  render() {
    return <button className="kuiButton" onClick={() => this.onClick()}/>
  }
}
```
Background: https://facebook.github.io/react/docs/handling-events.html
There is also an eslint rule we should be able to turn on for this.

### Never mutate state directly
Good:
```
this.setState(prevState => { clickCount: prevState.clickCount + 1 });
```
Bad:
```
this.state.clickCount += 1;
```

### Prefer primitives over objects when storing in state.
Good:
```
this.setState({
  currentPage: 0,
  selectedIds: []
});
```

Discouraged:
```
this.setState({
  pager: new Pager(),
  selectedIds: new SelectedIds()
});
```

## General Guidelines
### Prefer pure functions when possible
Pure functions are easier to understand. We don't want to have to think about side effects or mutated state. When invoking a pure function, all we have to think about is what goes in and what comes out.

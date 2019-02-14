## Dashboard State Walkthrough

A high level walk through of types of dashboard state and how dashboard and
 embeddables communicate with each other. An "embeddable" is anything that can be dropped
 on a dashboard. It is a pluggable system so new embeddables can be created, as
 long as they adhere to the communication protocol. Currently the only two embeddable types
 are saved searches and visualizations. A truly pluggable embeddable system is still a
 WIP - as the UI currently only supports adding visualizations and saved searches to a dashboard.


### Types of state

**Embeddable metadata** - Data the embeddable instance gives the dashboard once as a
 return value of EmbeddableFactory.create. Data such as edit link and title go in
 here. We may later decide to move some of this data to the dynamic embeddable state
 (for instance, if we implemented inline editing a title could change), but we keep the
 separation because it allows us to force some consistency in our UX. For example, we may
 not want a visualization to all of a sudden go from supporting drilldown links to
 not supporting it, as it would mean disappearing panel context menu items.
 
**Embeddable state** - Data the embeddable gives the dashboard throughout it's lifecycle as 
  things update and the user interacts with it.  This is communicated to the dashboard via the
  function `onEmbeddableStateChanged` that is passed in to the `EmbeddableFactory.create` call.

**Container state** - Data the dashboard gives to the embeddable throughout it's lifecycle
 as things update and the user interacts with Kibana. This is communicated to the embeddable via
 the function `onContainerStateChanged` which is returned from the `EmbeddableFactory.create` call

**Container metadata** - State that only needs to be given to the embeddable once, 
 and does not change thereafter. This will contain data given to dashboard when a new embeddable is
  added to a dashboard. Currently, this is really only the saved object id.
 
**Dashboard storage data** - Data persisted in elasticsearch. Should not be coupled to the redux tree.

**Dashboard redux tree** - State stored in the dashboard redux tree.

**EmbeddableFactory metadata** - Data that is true for all instances of the given type and does not change.
I'm not sure if *any* data belongs here but we talked about it, so keeping it in here. We thought initially
 it could be supportsDrillDowns but for type visualizations, for example, this depends on the visualization
 "subtype" (e.g. input controls vs line chart).
 
 
 
### Dashboard/Embeddable communication psuedocode
```js
dashboard_panel.js:

// The Dashbaord Panel react component handles the lifecycle of the
// embeddable as well as rendering. If we ever need access to the embeddable
// object externally, we may need to rethink this.
class EmbeddableViewport extends Component {
  componentDidMount() {
    if (!initialized) {
      this.props.embeddableFactory.create(panelMetadata, this.props.embeddableStateChanged)
        .then(embeddable => {
          this.embeddable = embeddable;
          this.embeddable.onContainerStateChanged(this.props.containerState);
          this.embeddable.render(this.panelElement);
        }
    }
  }
  
  componentWillUnmount() {
    this.embeddable.destroy();
  }
  
  // We let react/redux tell us when to tell the embeddable that some container
  // state changed.
  componentDidUpdate(prevProps) {
    if (this.embeddable && !_.isEqual(prevProps.containerState, this.props.containerState)) {
      this.embeddable.onContainerStateChanged(this.props.containerState);
    }
  }
  
  render() {
    return (
      <div>
        <PanelHeaderContainer embeddable={this.embeddable} />
        <div ref={panelElement => this.panelElement = panelElement}></div>
       </div>
    );
  }
}

------
actions/embeddable.js:

/**
 * This is the main communication point for embeddables to send state
 * changes to dashboard.
 * @param {EmbeddableState} newEmbeddableState
 */
function onEmbeddableStateChanged(newEmbeddableState) {
  // Map embeddable state properties into our redux tree.
}

```

### Container state
State communicated to the embeddable.
```
{
   // Contains per panel customizations like sort, columns, and color choices.
   // This shape is defined by the embeddable. Dashboard stores it and tracks updates
   // to it.
   embeddableCustomization: Object,
   hidePanelTitles: boolean,
   title: string,
   
   // TODO:
   filters: FilterObject,
   timeRange: TimeRangeObject,
}
```

### Container metadata
```
{
   // Any shape needed to initialize an embeddable. Gets saved to storage. Created when
   // a new embeddable is added. Currently just includes the object id.
   embeddableConfiguration: Object,
}
```

### Embeddable Metadata
```
  {    
    // Index patterns used by this embeddable. This information is currently
    // used by the filter on a dashboard for which fields to show in the
    // dropdown. Otherwise we'd have to show all fields over all indexes and
    // if no embeddables use those index patterns, there really is no point
    // to filtering on them.
    indexPatterns: Array.<IndexPatterns>,
    
    // Dashboard navigates to this url when the user clicks 'Edit visualization'
    // in the panel context menu.
    editUrl: string,
    
    // Title to be shown in the panel. Can be overridden at the panel level.
    title: string,
    
    // TODO:
    // If this is true, then dashboard will show a "configure drill down
    // links" menu option in the context menu for the panel.
    supportsDrillDowns: boolean,
  }
```

### Embeddable State
Embeddable state is the data that the embeddable gives dashboard when something changes

```
{
   // This will contain per panel embeddable state, such as pie colors and saved search columns.
   embeddableCustomization: Object,
   // If a filter action was initiated by a user action (e.g. clicking on a bar chart)
   // This is how dashboard will know and update itself to match.
   stagedFilters: FilterObject,
  
  
   // TODO: More possible options to go in here: 
   error: Error,
   isLoading: boolean,
   renderComplete: boolean,  
   appliedtimeRange: TimeRangeObject,
   stagedTimeRange: TimeRangeObject,
   // This information will need to be exposed so other plugins (e.g. ML)
   // can register panel actions.
   esQuery: Object,
   // Currently applied filters
   appliedFilters: FilterObject,
}
```

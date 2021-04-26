- Start Date: 2020-04-26
- RFC PR: (leave this empty)
- Kibana Issue: (leave this empty)

---
- [1. Summary](#1-summary)
- [2. Detailed design](#2-detailed-design)

# 1. Summary

A timeslider is a UX component that allows users to intuitively navigate through time-based data.

This RFC proposes adding a timeslider control to the Maps application. 

It outlines two phases for roll-out in the Maps application.
- arbitrary time-range selection with stepped navigation
- data histogram preview and playback



Since the a timeslider UX is relevant for other Kibana apps, the implementation should be portable. We propose to implement as a React-component 
without implicit dependencies on Kibana or Maps.


This RFC proposases an integration with the Timeslider-React component as an Embeddable, and the introduction of a new piece of embeeddable-state `TimesSlice`.

This RFC does not address how this component should _behave_ in apps other than the Maps-app.


# 2. Detailed design


## 2.1 Design phases overview

### 2.1.1 Time-range selection and stepped navigation


A first phase includes arbitrary time-range selection and stepped navigation.

![Timeslider version 1](../images/timeslider/v1.png)


### 2.2.2 Data distribution preview with histogram and playback

A second phase adds 

![Timeslider version 2](../images/timeslider/v2.png)


## 2.2 The timeslider UX React-component


### 2.2.1 Interface

The core timeslider-UX is a React-component.

The component has no implicit dependencies on any Kibana-state or Maps-store state. 

Its interface its fully defined by its `props`-contract.





Since there will be only an initial use inside Maps, we propose not to over-architect this 

Nonetheless, this UX-component should be easily "copy-pastable" to another location.


### 2.2.1 Internals

Setting of the . The division of the 



## 2.3 Integrations of the timeslider React component

This R

### 2.3.1 Timeslider in Maps (short-term)


#### 2.3.1.1 Position in the UX


#### 2.3.1.1 End-user behavior

#### 2.3.1.2 Data-fetch considerations



### 2.3.2 Timeslider as an Embeddable (long-term)

This below is a forward looking section. It's a proposal of how the

It requires the new
`TimeSlice`

### Drawbacks

The
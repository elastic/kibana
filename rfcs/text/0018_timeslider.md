- Start Date: 2020-04-26
- RFC PR: (leave this empty)
- Kibana Issue: (leave this empty)

---
- [1. Summary](#1-summary)
- [2. Motivation](#2-motivation)
- [3. Design phases](#3-detailed-design)
- [4. Implementation proposal](#4-detailed-design)
- [5. Unresolved questions](#5-unresolved-questions)

# 1. Summary

A timeslider is a UX component that allows users to intuitively navigate through time-based data.

This RFC focuses on a proposal to add timeslider will function in the Maps application. 

It outlines two phases for rollout. 

Efficient data retrieval is considered to be 

Given that a Timeslider-control is relevant for other Kibana apps, we intend the timeslider to be portable.

This RFC details the

This RFC does not address how this component should behave on a dashboard with other visualizations, or how it should behave in other Kibana applications.


# 2. Motivation



# 3. Design phases


# 3.1 Time-range selection and stepped navigation


# 3.2 Data distribution preview and 


# 4. Implementation proposal


The [saved objects type registry](https://github.com/elastic/kibana/blob/701697cc4a34d07c0508c3bdf01dca6f9d40a636/src/core/server/saved_objects/saved_objects_type_registry.ts) will allow consumers to register "private" saved object types via a new `accessClassification` property:


## 4.1 Timeslider UX



## 4.2 Data fetch (Maps specific)




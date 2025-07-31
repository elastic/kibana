# @kbn/response-ops-recurring-schedule-form

[Form lib](https://docs.elastic.dev/form-lib/welcome) fields to create RRule recurring schedules.

## Usage

In your form schema, add a `recurringSchedule` field:

```tsx
const form = useForm({
  schema: {
    recurringSchedule: getRecurringScheduleFormSchema(),
  }
});
```

And render `RecurringScheduleFormFields` in your form: 

```tsx
<RecurringScheduleFormFields
  startDate={startDate}
  endDate={endDate}
  timezone={timezone}
/>
```

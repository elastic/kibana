# x-pack/examples/onweek_23_12_pmuellr

On-Week 2023-12 bits from Patrick Mueller, as an x-pack/examples PR

- [Images for Actions](images_for_actions.md)

  Allow actions to generate images.

  # images for actions

Customers would like to have an image attached to notifications from
alerts.  Here are assumptions / constraints:

- the image should be a graph of the same data the alert is processing,
  showing the last few times the alert ran, and associated values

- images will not be persisted to Kibana, because of the size

- images will not be remotely available via Kibana URL, as this would
  require authorization which is unlikely to work correctly when using
  notification clients like GMail and Slack, which requests
  images serverside

- initial notification targets are email and Slack

- initial rule type targetting index threshold, which is simple and
  has some API around preview charting we can reuse

- images could be SVG, if supported by client (I think gmail will work,
  unclear on Slack) - it looks like Slack does not support SVG well at all.
  GMail also does not support SVG, as it turns out.

- currently converting SVG to PNG via puppeteer

- Slack supports uploading an image file, marking it
  "public", and then referring to it: 
  https://stackoverflow.com/questions/58186399/how-to-create-a-slack-message-containing-an-uploaded-image

- I was thinking we could read previous values for the chart from the
  alerts indices, but they only have data when the rule is alerting;
  we'll need to store it with the rule / rule task state!

- We won't even neccessarily have old run data with the old values, if
  they aren't alertable.  Ideally, we shouldn't be persisting any non-alertable
  data, but this is a case we need to.  The stack alerting rules use a function
  to return data to build the preview chart, which I think will have to be
  good enough for now.  
  
  x-pack/plugins/triggers_actions_ui/server/data/lib/time_series_query.ts  

- We'll arrange to optionally generate that data in the alert, and 
  add it to the action context as a JSON blob.

- In the action itself, we'll have a special way of indicating "add
  the image here".  Maybe a mustache lambda?  It wouldn't really be
  functional, more of a marker.  When found, we'd use the data passed
  in for the chart to a library to build a Vega-lite chart from, and
  then turn that into a PNG (requires cairo support, so will eat RAM).

- For slack, we'll have to upload that image, mark it "public", then
  we can get the link for it and reference it in the Slack blockit 
  message.  

- For email, we use nodemailer which has support for adding attachments;
  follow the links from here: https://nodemailer.com/message/

## extending slack to support block kit

_Note: this is unneeded; messages with images are posted by uploading
the image with an "initial_comment", other messages are sent the old
way._

Made a quick hack to the slack api connector - if the first character
starts with `[` or `{`, we treat the text as JSON "blocks".  Here's an
example to use in an action:

```
[
  { 
    "type": "section",
    "text": {
        "type": "mrkdwn",
        "text": "hallo from blockkit!"
    }
  }
]

[
  { 
    "type": "section",
    "text": {
        "type": "mrkdwn",
        "text": "hallo from blockkit!"
    }
  },
  {
    "type": "image",
    "alt_text": "image from Kibana",
    "image_url": "data:image/png;base64"
  }
]
```

## embedding an image in a rule action

This only works with index threshold and the slack api connector.

Use `{{{context.chartData}}}` in an index threshold rule action to 
expand into the goop that a Slack action will use as data for an
image.

For example, this is a nice, small message:

    {{context.message}}

    {{{context.chartData}}}

## testing with just http action invocation

We can simulate what a rule would populate with `{{{context.chartData}}}`,
with the following curl invocation, assuming `slack-api` is the 
id of a `.slack_api` connector:

(see also script [`test-images-in-actions.sh`](./test-images-in-actions.sh))

```sh
curl $KB_URL/api/actions/connector/slack-api/_execute \
  -H "content-type: application/json" \
  -H "kbn-xsrf: foo" \
  -d '{
    "params": {
      "subAction": "postMessage",
      "subActionParams": {
        "channels": ["kibana-alerting"],
        "text": "<kibana-chart-data>{\"values\":[{\"d\":\"2023-12-19T12:20:43.000Z\",\"v\":0,\"g\":\"group A\"},{\"d\":\"2023-12-19T12:20:44.000Z\",\"v\":1,\"g\":\"group A\"}],\"field\":\"some.field\",\"thresholds\":[2.5]}</kibana-chart-data>"
      }
    }
  }'
```

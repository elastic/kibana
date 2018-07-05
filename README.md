# kibana-canvas

"Never look back. The past is done. The future is a blank canvas." ― Suzy Kassem, Rise Up and Salute the Sun

### Getting Started

Use the following directory structure to run Canvas:

```bash
$ ls $PATH_TO_REPOS
 ├── kibana
 └── kibana-extra/kibana-canvas
```

Setup `kibana` and `elasticsearch`. See instructions [here](https://github.com/elastic/kibana/blob/master/CONTRIBUTING.md#setting-up-your-development-environment).

Fork, then clone the [Canvas](https://github.com/elastic/kibana-canvas) repo into `kibana-extra/` and change directory into it.

```bash
# cd kibana-extra/
git clone https://github.com/[YOUR_USERNAME]/kibana-canvas.git
cd kibana-canvas
```

Install dependencies

```bash
# in kibana-canvas/
yarn kbn bootstrap
```

Start Canvas

```bash
# in kibana-canvas/
yarn start
```

### Feature Questions

**Why are there no tooltips**

We've opted for always available data labels instead, for now. While there exists much functionality that can be used for analytical purposes in Canvas our core concern in presentational. In a hands-off presentation format, such as a report or a slideshow, there is no facility for user to mouseover a chart to see a tooltip; data labels are a better fit for us.

### Background

**What is Kibana Canvas?**

Kibana Canvas is a new visualization application on top of Elasticsearch data. Canvas is extremely versatile, but particularly differentiating example use cases include live infographics, presentations with live-updating charts, and highly customized reports.

**Why did we build it? How does this align with the larger Kibana vision?**

We realized early on that we are not trying to build one UI “to rule them all” in Kibana. Elasticsearch caters to a wide variety of use cases, users, and audiences and Kibana provides different experiences for these users to explore and interact with their data. Canvas is one of such applications, in particular catering to users looking for desktop-publishing level of control for the presentation of their data summaries.

**Does Canvas replace any part of Kibana?**

No, it is an alternative experience that does not conflict with other parts of Kibana.

**Isn’t there overlap between Canvas and Dashboard?**

While both can be used as a way to build up reports, Canvas and Dashboard have different goals. Canvas focuses on highly customizable layout more suited to highly curated presentations, while Dashboard provides a fast and efficient way to build up and manage business analytics and operational dashboards that don’t require a high degree of layout control and customizability.

**Where can I see a demo of Canvas?**

Internal demo at dev demo day (starts at 00:02:04)
https://drive.google.com/file/d/0B1QVAZnA-FxtdGNNRW9vY09fTkE/view

Elasticon 2017 keynote (starts at 01:27:00)
https://www.elastic.co/elasticon/conf/2017/sf/opening-keynote

**How can I get an early build?**

No internal build available yet.

**OK, fine, be like that. Where can I get screenshots?**

If you want a stream of conciousness of the absolute latest development, scroll to the end of Rashid's "blog issue"  
https://github.com/elastic/kibana-canvas/issues/109

Screenshots from the ElasticON talk are available here:  
https://drive.google.com/drive/u/0/folders/0B1DdqIqU4qUNZklhU0xaM1lRYUE

### Engineering

**Where does Canvas code live?**

For now all of the code lives in this repo: https://github.com/elastic/kibana-canvas

**Where can I find Canvas milestones / roadmap?**

Some notes [here](https://docs.google.com/document/d/1UPHeTqugEo0CbCKGK-afNK1iEbQtWQv6t7DTDumRY14/edit?pli=1#), permanent place TBD. The roadmap is, as usual, subject to change.

**How will embeddability work? Will it be possible to embed visualizations (including Timelion and TSVB) in Canvas? Will it be possible to embed Canvas visualizations in Dashboard?**

We plan to allow for saved Kibana visualizations to be embedded within Canvas. Going the other direction is less certain and requires review of the benefits, engineering and tradeoffs.

**How will Canvas work with “Dashboard only” mode?**

Canvas work pads have an editable and non-editable mode. In dashboard only mode there will be no option to enable editing of the work pad.

**How will Canvas work with reporting?**

We plan to allow Canvas work pads to be exportable to PDF via reporting. Canvas pages can be setup as paper-sized to allow for pixel perfect printing

### Go-to-market

**Will this be Open Source? Basic? Gold? Platinum?**

The current plan is X-Pack Basic (not to share externally). Some parts and plugins may be open source but the core will part of X-Pack

**We demoed this internally and then at Elastic{ON}, and it looked pretty finished. When will this be released in GA?**

What you saw in the previous demos was a well-polished prototype. There are still a number of important engineering considerations to work out, which we are in the process of doing, so GA is TBD.

**What are the next planned milestones?**

Refer to details of planned milestones [here](https://docs.google.com/document/d/1UPHeTqugEo0CbCKGK-afNK1iEbQtWQv6t7DTDumRY14/edit?pli=1#).

**Will there be an internal and external testing / beta testing period?**

Yes, here is the tentative release process for Milestone 1

- Internal release (a few weeks?)
  - Goal: Make Milestone 1 candidate build good enough that we could release it publicly if we so choose, but to get feedback internally first
  - Decide if it’s good enough for public release
- Public “research” build (a couple of months?)
  - Goal: Fast iterations as feedback comes in (daily, if necessary)
  - Separate plugin that requires X-Pack
  - We’ll enforce it on the plugin layer, so it won't install or run without x-pack, but it will be distributed separately
- Public beta or GA distributed with the stack
  - Details TBD

### Contact

**Who should I contact internally to talk about Canvas engineering or go-to-market questions?**

Canvas is a functional area within Kibana with Rashid Khan as lead, Joe Fleming as engineer, and Alex Francouer & Tanya Bragin as product managers.

**Can customers that saw a demo at Canvas at Keynote provide feedback and get an update?**

Absolutely. Kibana team is open to feedback on the concept of Canvas. Please contact pm@elastic.co to schedule a conversation about your use case and how you envision using Canvas.

### Releases

Releases are uploaded to AWS S3. These instructions assume you have already setup MFA and have installed the AWS CLI tools. To get your release credentials run:

```
aws sts get-session-token --serial-number <AWS Assigned MFA Device ID> --token-code <Token Code>
```

You can find the MFA Device ID at:

```
AWS Console -> IAM -> Find your username -> Security Credentials -> Assign MFA Device (string starting with arn:aws....)
```

That will dump something that looks like:

```
[default]
{
    "Credentials": {
        "SecretAccessKey": "<Your new secret access key>",
        "SessionToken": "<Your new big long session token>",
        "Expiration": "2018-01-31T09:22:34Z",
        "AccessKeyId": "<Your new access key id>"
    }
}
```

You can then move this information to your `~/.aws/credentials` file:

```
[default]
aws_secret_access_key = <Your new secret access key>
aws_session_token = <Your new big long session token>
aws_access_key_id = <Your new access key id>
```

To publish the release run:

```
npm run release
```

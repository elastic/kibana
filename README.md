# Timelion

Timelion pronounced time-lion, not time-leon, brings together totally independent data sources into a single interface, driven by a simple, one-line expression language combining data retrieval, time series combination and transformation, plus visualization.

- How many pages does each unique user hit over time?
- Whats the difference between this Friday and last Friday?
- What % of Japan’s population came to my site today?
- What’s the 10 day moving average of the S&P 500?
- How what is the cumulative sum of all searches made in the last 2 years?

Timelion makes all that possible, and more. Timelion is an Elastic {Re}search project into time series, but its more than just an experiment: Its completely usable. By you. Right now.

### Installation
- Run this, bounce the Kibana server. and refresh your browser: `./bin/kibana plugin -i kibana/timelion`
- **Timelion requires the latest version of Kibana.** Always. What does that mean? I means if a beta version of kibana 9.2.1492 comes out, you'll need to install the latest version of Kibana to install Timelion.
- **You can not install from the archives that github provides**. They are not built versions, they won't work, use the command above.

### Timelion expressions
Every Timelion expression starts with a data source function. For example .elasticsearch(*) (or .es(*) for short). That’s about as simple as it gets right? Count everything in Elasticsearch over time. Easy peasy. As you can see, functions always start with a '.' (dot). What if I want to answer that first question above: “How many pages does each unique user hit over time”. Well, I could plot the two parts together on the same chart, by separating them with a comma. But there's a better way ...

![](https://www.elastic.co/assets/blt6858173f61f41f74/Screen%20Shot%202015-11-12%20at%202.16.23%20PM.png) 
We can do more than individual functions, we can chain functions! What I really want is to divide total hits by unique users. WE CAN DO THAT. SCORE. What we're doing here is saying: Get everything, then divide every point in that series, by every point in this cardinality-of-user-field series I'm passing to .divide()

![](https://www.elastic.co/assets/blt7e65751490506e7f/Screen%20Shot%202015-11-12%20at%202.14.56%20PM.png)
We can do that, we can do more: Timelion can reach out to other data sources, using the exact same syntax. For example, the Worldbank’s Data API. Series even can be grouped together into lists with parenthesis and a function applied to the grouping. All data sources can receive an offset argument, eg offset=-1M to compare last month as if it was happening now. Timeline can even fit series with dissimilar intervals to a reference, then enabling you to divide you by-the-minute Elasticsearch series with say, yearly Worldbank data.

![](https://www.elastic.co/assets/blt9117e105b1535caf/Screen%20Shot%202015-11-12%20at%202.27.39%20PM.png) 

That means we can mix and match these sources, even within the same expression.Thus we can ask crazy questions like “What percentage of the US Gross Domestic Product is my company personally responsible for year-to-date?” Also, if that number is big, how about sharing with your old buddy Rashid? Just kidding. Or am I?

### Funk-shun Al
There’s 25 different functions, from simple arithmetic like addition and division to moving averages, cumulative sums and derivatives. That said, Timelion functions and data sources are totally pluggable and super easy to write. We’d love your help rounding out the offering, so get hacking!

### Go get it
I won't give it all away, there’s more to it than just this post. Timelion will launch a tutorial to step you through configuration and some simple starter functions, the rest is up to you to discover.

Installing it is easy, run this, bounce the Kibana server. and refresh your browser: `./bin/kibana plugin -i kibana/timelion`. Or you can try it on Found, the best hosted Elasticsearch in the history of the universe, for free: Found by Elastic 

Now use it. Abuse it.
Once you've installed it, you'll have a new icon in Kibana, which opens the app switcher and allows you to enter other apps

![](https://www.elastic.co/assets/bltb6b576d300d1ae45/Screen%20Shot%202015-11-12%20at%205.33.20%20PM.png)

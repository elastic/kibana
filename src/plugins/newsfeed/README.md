# newsfeed

The newsfeed plugin adds a NewsfeedNavButton to the top navigation bar and renders the content in the flyout.
Content is fetched from the remote (https://feeds.elastic.co and https://feeds-staging.elastic.co in dev mode) once a day, with periodic checks if the content needs to be refreshed. All newsfeed content is hosted remotely.

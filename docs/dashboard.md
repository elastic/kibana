## Dashboard

The dashboard is used to group and display any Visualizations you've created. Once you have a collection of visualizations that you like, you can save it as a custom dashboard to share or reload later.

### Getting Started

Using the dashboard requires that you have at least one [saved visualization](#visualize).

#### Creating a New Dashboard

The first time you open the Dashboard, it will be ready for you to build a new dashboard. You can create a new dashboard by clicking the left-most icon in the toolbar panel.

#### Adding Visualizations to a Dashboard

To add a visualization to the dashboard, click the plus button in the toolbar panel. A menu of your saved visualizations will appear.

From the menu, click on the visualization you want to include in your dashboard. If you have more then 5 saved visualizations, the list will paginate. You can also filter the list from the **Visualization Filter** at the top of the list.

Once you've clicked on the visualization, you will see it appear in a *container* in the dashboard below.

**NOTE:** You may see a message saying that the height and/or width of the container is too small. If you see this message, you can fix it by making the container larger - described below.

#### Saving Dashboards

Click on the save button in the toolbar panel to save the dashboard to Elasticsearch. Clicking the save icon will show you a menu below the toolbar panel where you can enter a name for your dashboard. After giving it a name, click the *Save* button.

#### Loading a Saved Dashboard

To load an existing dashboard, click on the *Open* icon in the toolbar menu. This will present you with a list of existing dashboard you can load. If you have more then 5 dashboards, you can use the filter input at the top to search for the dashboard you want to load or click the page links at the bottom of the loader panel.

#### Sharing Dashboards

To obtain the code needed to embed a dashboard in other applications, click the right-most icon in the toolbar menu. It will present you with menu containing two links.

##### Embedding Dashboards

Dashboards can be embedded in other web apps by using the embed code. Simply copy the embed code from the *Share* menu and paste it in your external web application. Note that anyone that views an embedded dashboard must also have access to Kibana.

##### Sharing Dashboards

Dashboards can also be shared with anyone that has access to Kibana. Simply copy the share link from the *Share* menu and share it with others via email or other means.

### Customizing Your Dashboard

The dashboard can be customized in a number of ways to suit your needs.

#### Moving Containers

To move containers around, drag the container by clicking and holding the header and moving it where you want it. Other containers may shift around to make room for the container you are moving. When you are happy with the location of the container, release the mouse button.

#### Resizing Containers

As you move the mouse cursor to the bottom right corner of the container, a small move icon will appear. Once your cursor changes the move icon, you can click and drag the container to make it the size you need.  When you let go of the mouse button, the visualization inside the container will adjust to the new container size.

#### Removing Containers

Containers can be removed from your dashboard by clicking on the close icon located in the top right of corner the container. This will not delete the saved visualization, it will remove it from the current Dashboard.

### Viewing Detailed Information

It may sometimes be useful to view the data that is being used to create the visualization. You can view this information by clicking on the bar at the bottom of the container. Doing so will hide the visualization and show the raw data it's using.  There are four tabs at the top of this view that break down the data in various ways.

#### Table

This is a representation of all the underlying data, presented as a paginated data grid. The items in this table can be sorted by clicking on the table headers at the top of each column.

#### Request

This is the raw request used to query the server, presented as prettified JSON text.

#### Response

This is the raw response from the server, presented as prettified JSON text.

#### Statistics

This is a summary of the statistics related to the request and the response, presented as a data grid. It includes information such as the query duration, the request duration, the total number of records found on the server and the index pattern used to make the query.

### Changing the Visualization

To change a visualization, click on the *Edit* icon at the top right of the visualization container. This will open that visualization in the *Visualize* app. Refer to the [Visualize docs](#visualize) for usage instructions.

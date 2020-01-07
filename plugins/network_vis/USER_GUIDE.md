# User Guide of Network Plugin

There are many ways to create a network visualization, these are:

### Network with only nodes and no relation

1. Select ”Node” aggregation in buckets.
2. Select the field that will define the nodes in the “Field” tab, establish how it is going to be
the order and how many data you want to obtain in Size. Optional: you can assign it an
specific label to this aggregation through the input ”Custom Label”.
3. Click “Play” button in order to load the visualization.

![Screenshot](images/onlynodes.png)

### Network with one type of nodes

1. Select ”Node” aggregation in buckets.
2. Select the field that will define the nodes in the “Field” tab, establish how it is going to be
the order and how many data you want to obtain in Size. Optional: you can assign it an
specific label to this aggregation through the input ”Custom Label”.
3. Select ”Relation” aggregation in buckets.
4. Select the field that will define the node relation in the “Field” tab, establish how it is
going to be the order and how many data you want to obtain in Size. Optional: you can
assign it an specific label to this aggregation through the input ”Custom Label”.
5. Click “Play” button in order to load the visualization.

![Screenshot](images/nodesrelated.png)

### Network with two type of nodes

1. Select ”Node” aggregation in buckets.
2. Select the field that will define the first type of node in the “Field” tab, establish how it is
going to be the order and how many data you want to obtain in Size. Optional: you can
assign it an specific label to this aggregation through the input ”Custom Label”.
3. Select ”Node” aggregation in buckets.
4. Select the field that will define the second type of node in the “Field” tab, establish how
it is going to be the order and how many data you want to obtain in Size. Optional: you
can assign it an specific label to this aggregation through the input ”Custom Label”.
5. Click “Play” button in order to load the visualization.

![Screenshot](images/nodenode.png)

### Add Node Color

1. Build a network of those ones previously described.4.3.
2. Select ”Node” Color aggregation in buckets.
3. Select the field that will define the node color in the “Field” tab, establish how it is going
to be the order and how many data you want to obtain in Size. Optional: you can assign
it an specific label to this aggregation through the input ”Custom Label”.
4. Click “Play” button in order to load the visualization.

### Types of Error on selecting buckets

* The aggregations have been configured in order to the aggregation or aggregations “Node”
must be selected the first ones compulsory; Otherwise, it will appear the next Warning
message:

![Screenshot](images/nodefirsterror.png)

* When it is chosen as aggregations, the aggregation “Node” twice and the aggregation
“Relation”, it will be shown an error message in the visualization area:

![Screenshot](images/errornodenoderelation.png)

* So that the data obtained from the chosen aggregations make sense, the aggregation
“Node Color” must be selected the last one, otherwise, it will be shown the next error
message in the visualization area:

![Screenshot](images/errornodecolor.png)

### Add Node/Edge Size Customization

1. Select ”Node/Edge Size” aggregation in metrics.
2. Select a type of metric that will define the size of the node/edge, in case of selecting a
type that needs a field to obtain it, select the field in the “Field” tab. Optional: you can
assign it an specific label to this aggregation through the input ”Custom Label”.
3. Click “Play” button in order to load the visualization.

![Screenshot](images/sizes.png)
